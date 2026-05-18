---
sidebar_label: "page(2)"
sidebar_position: 5
---

# page (2)

일반적인 page는 x86_64 기준 4KB 단위의 base page로 관리됩니다. 하지만 커널은 항상 4KB 단위로만 메모리를 사용하는 것은 아닙니다. 경우에 따라 여러 개의 page를 하나의 큰 page처럼 묶어 관리할 필요가 있으며
이를 compound page라고 합니다.

compound page는 하나의 head page와 여러 개의 tail page로 구성됩니다. head page는 compound page 전체를 대표하고, tail page들은 head page에 종속됩니다.

예를 들어 order가 2인 compound page라면 총 2²개의 base page, 즉 4개의 page로 구성되며, x86_64 환경에서는 총 16KB 크기의 page처럼 동작하게 됩니다.

```c title="mm/page_alloc.c"
struct page {
    unsigned long flags;

    union {

        ...

        struct {    /* Tail pages of compound page */
            unsigned long compound_head;    /* Bit zero is set */

            /* First tail page only */
            unsigned char compound_dtor;
            unsigned char compound_order;

            atomic_t compound_mapcount;
            atomic_t compound_pincount;

#ifdef CONFIG_64BIT
            unsigned int compound_nr;       /* 1 << compound_order */
#endif
        };

        struct {    /* Second tail page of compound page */
            unsigned long _compound_pad_1;
            unsigned long _compound_pad_2;

            struct list_head deferred_list;
        };

        struct {    /* Page table pages */
            unsigned long _pt_pad_1;

            pgtable_t pmd_huge_pte;

            unsigned long _pt_pad_2;

            union {
                struct mm_struct *pt_mm;
                atomic_t pt_frag_refcount;
            };

#if ALLOC_SPLIT_PTLOCKS
            spinlock_t *ptl;
#else
            spinlock_t ptl;
#endif
        };

        ...

    };

    union {
        atomic_t _mapcount;
        unsigned int page_type;
    };

    atomic_t _refcount;

#ifdef CONFIG_MEMCG
    unsigned long memcg_data;
#endif

    ...
};
```

[mm_types.h](https://elixir.bootlin.com/linux/v6.0/source/include/linux/mm_types.h#L72)

tail page의 compound_head 필드는 자신이 속한 head page를 가리킵니다. 이때 bit 0은 tail page 여부를 표시하기 위해 사용됩니다.

compound_order는 compound page의 크기를 나타냅니다. order가 n이면 compound page는 2ⁿ개의 base page로 구성됩니다.

compound_mapcount는 compound page 전체가 page table에 의해 몇 번 mapping되었는지를 추적하는 데 사용됩니다.

compound_pincount는 get_user_pages(GUP) 등을 통해 page가 pin된 횟수를 관리합니다. pin된 page는 reclaim이나 migration 과정에서 특별한 처리가 필요하기 때문에 별도로 추적됩니다.

한편 page table 자체 역시 결국 물리 메모리 위에 존재하므로, page table page 또한 struct page를 통해 관리됩니다.

ptl은 page table lock으로, 여러 CPU가 동시에 page table을 수정하는 상황에서 synchronization을 위해 사용됩니다.

즉 struct page는 단순히 사용자 데이터를 저장하는 page만 표현하는 것이 아니라, virtual memory를 구성하는 page table 자체 역시 동일한 메타데이터 구조로 관리합니다.

하지만 시간이 지나면서 struct page 기반 모델은 점점 복잡해지기 시작했습니다. 특히 page cache나 reclaim 경로에서는 실제로는 여러 개의 page를 하나의 단위처럼 다루는 경우가 많았지만, 내부 API 상당수가 여전히 “4KB base page 하나”를 기준으로 설계되어 있었기 때문입니다.

예를 들어 Transparent Huge Page(THP) 환경에서는 실제로는 하나의 큰 메모리 단위를 다루고 있음에도, 내부적으로는 반복적으로 compound 여부를 확인하거나 head/tail page를 구분해야 하는 문제가 존재했습니다.

이를 개선하기 위해 도입된 개념이 folio입니다.

folio는 “하나 이상의 연속된 page를 표현하는 메모리 관리 단위”입니다. 기존 struct page가 base page 중심이었다면, folio는 처음부터 “여러 page를 하나의 객체처럼 다루는 것”을 전제로 설계되었습니다.

즉 folio는 compound page를 대체하는 새로운 물리 메모리 구조라기보다:

- page cache
- reclaim
- writeback
- file-backed memory

등에서 compound page와 base page를 보다 일관된 방식으로 처리하기 위한 상위 abstraction에 가깝습니다.

실제 내부적으로 folio 역시 struct page 기반 위에서 동작합니다. 다만 기존의 “이 page가 compound인가?”를 반복적으로 검사하는 방식 대신, 처음부터 folio 단위로 동작하게 함으로써 page cache 및 memory management 경로를 단순화하려는 목적을 가집니다.

기존 커널에서는 compound page를 다룰 때, 전달받은 struct page가 head page인지 tail page인지 직접 확인해야 하는 경우가 많았습니다.

예를 들어 THP(Transparent Huge Page) 환경에서는 함수가 tail page를 전달받을 수도 있었기 때문에, 실제 compound page 전체를 다루기 위해 먼저 head page를 찾아야 했습니다.

이를 위해 커널은 compound_head() 같은 helper를 사용했습니다.

tail page의 compound_head 필드에는 자신이 속한 head page 주소가 저장되어 있으며, bit 0은 tail page 여부를 나타내는 플래그로 사용됩니다. 따라서 compound_head()는 이 값을 통해 현재 page가 tail page인지 확인하고, 실제 head page 주소를 복원하는 역할을 수행했습니다.

문제는 이러한 과정이 page cache, reclaim, writeback 등 다양한 memory management 경로 전체에 반복적으로 등장했다는 점입니다. 즉 커널 내부에는:

- 현재 page가 compound page인지 확인하고
- tail page라면 head page를 찾아 변환한 뒤
- 다시 실제 작업을 수행하는

패턴이 매우 많이 존재했습니다.

folio는 이러한 복잡성을 줄이기 위해 도입되었습니다.

기존 struct page 기반 API는 “4KB base page 하나”를 기본 단위로 가정했지만, folio는 처음부터 “하나 이상의 page를 하나의 객체처럼 다룬다”는 것을 전제로 설계되었습니다.

따라서 folio 기반 코드에서는 반복적으로 compound 여부를 검사하거나 head page를 찾는 과정이 크게 줄어들었고, page cache 및 file-backed memory 경로 역시 보다 일관된 형태로 정리될 수 있게 되었습니다.
