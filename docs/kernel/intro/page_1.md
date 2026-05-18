---
sidebar_label: "page(1)"
sidebar_position: 4
---

# page (1)

리눅스 커널은 물리 메모리를 일반적으로 4KB 단위의 page로 관리합니다.

그리고 커널은 각 물리 page마다 struct page라는 메타데이터를 사용해,

- 해당 page가 현재 어떤 용도로 사용되고 있는지,
- 몇 번 참조되었는지,
- 락의 상태는 어떠한지
  등의 정보를 관리합니다.

하지만 모든 page가 동일한 정보를 필요로 하는 것은 아닙니다.

대표적으로 리눅스는 page를 크게 file-backed page와 anonymous page로 나누어 관리합니다.

file-backed page는 파일과 연결된 page로,

- 어떤 파일과 연결되어 있는지(mapping),
- 파일 내부의 어느 offset인지(index)
  같은 정보가 중요합니다.

반면 anonymous page는 heap, stack과 같이 런타임에 생성된 내용을 저장하고 있는 메모리로, 파일과 연결되어 있지 않는 데이터입니다.
그러므로, 동일한 방식의 file mapping 정보를 필요로 하지 않습니다.

따라서 리눅스 커널은 struct page 내부에 union을 사용하여, page의 역할에 따라 동일한 메모리 공간을 다르게 해석하는 방식을 사용합니다.

x86_64 환경에서 struct page는 일반적으로 약 64byte 정도의 크기를 가집니다.

```c title="mm/page_alloc.c"
struct page {
    unsigned long flags;

    union {
        struct {    /* Page cache and anonymous pages */
            union {
                struct list_head lru;

                ...

                struct list_head buddy_list;
                struct list_head pcp_list;
            };

            struct address_space *mapping;
            pgoff_t index;
            unsigned long private;
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

flags는 해당 page의 상태를 나타내는 필드입니다. page가 locked 상태인지, dirty 상태인지, LRU에 올라가 있는지, buddy allocator의 free page인지 같은 상태 정보가 이 필드를 통해 표현됩니다.

lru는 page가 reclaim 대상이 될 때 LRU 리스트에 연결되기 위해 사용됩니다. file-backed page와 anonymous page 모두 메모리 회수 대상이 될 수 있으므로, 커널은 이 필드를 통해 page를 active/inactive list 등에 연결합니다.

buddy_list와 pcp_list는 page가 사용 중이 아니라 free 상태일 때 사용됩니다. buddy_list는 buddy allocator의 free list에 연결될 때 사용되고, pcp_list는 per-cpu page cache에 들어갈 때 사용됩니다. 즉 같은 공간이 page의 상태에 따라 LRU 리스트용으로도, free page 리스트용으로도 해석됩니다.

mapping은 이 page가 어떤 address_space와 연결되어 있는지를 나타냅니다. file-backed page에서는 해당 파일의 page cache를 관리하는 address_space를 가리킵니다. anonymous page의 경우에도 이 필드는 anon 관련 정보를 인코딩하는 데 사용됩니다.

index는 mapping 내부에서 이 page가 어느 위치에 해당하는지를 나타냅니다. file-backed page라면 파일 내부 offset을 page 단위로 표현한 값입니다.

private은 mapping에 종속적인 추가 정보를 저장하는 필드입니다. 예를 들어 filesystem buffer, swap entry, buddy allocator의 order 정보 등 page의 상태에 따라 다른 의미로 사용될 수 있습니다.

\_mapcount는 이 page가 page table에 의해 몇 번 mapping되어 있는지를 나타냅니다. 즉 사용자 공간에서 이 물리 page를 참조하는 PTE가 몇 개인지 추적하는 데 사용됩니다.

page_type은 해당 page가 일반적으로 userspace에 mapping되는 page가 아닐 때, page의 내부 종류를 나타내는 용도로 사용됩니다. \_mapcount와 같은 union에 있으므로 둘이 동시에 쓰이는 필드는 아닙니다.

\_refcount는 이 page 자체에 대한 참조 횟수입니다. page가 여전히 커널 내부에서 사용 중인지 판단하는 기본 기준이 됩니다. \_mapcount가 page table mapping 수에 가깝다면, \_refcount는 더 넓은 의미의 생명주기 참조 카운트입니다.

memcg_data는 memory cgroup이 활성화된 경우, 이 page가 어느 memory cgroup에 속하는지 추적하기 위해 사용됩니다.
