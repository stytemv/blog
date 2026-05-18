---
sidebar_label: "zone(1)"
sidebar_position: 2
---

# zone (1)

NUMA 시스템에서 커널은 먼저 물리 메모리를 Node 단위로 관리한다.
Node는 NUMA locality 기반의 메모리 관리 단위이며, 특정 CPU 그룹과 가까운 physical memory range를 나타낸다.

하지만 같은 Node 내부에서도 모든 물리 주소가 동일한 방식으로 사용 가능한 것은 아니다.

예를 들어 일부 장치는 낮은 물리 주소만 DMA 접근이 가능하고, 일부 메모리는 일반적인 커널 메모리 용도로 사용된다.
그래서 커널은 각 Node 내부의 physical memory를 다시 여러 개의 Zone으로 분리하여 관리한다.

즉 실제 메모리 관리 구조는 다음과 같은 형태를 가진다.

Node
Zone
Physical Pages

여기서:

Node는 NUMA locality 기준 분류
Zone은 physical address range 및 사용 제약 기준 분류

라는 차이가 존재한다.

다만 Zone이 Node의 단순한 하위 개념인 것은 아니다.
Node와 Zone은 서로 다른 기준의 메모리 분류 방식이며, 리눅스는 구현상 각 Node 내부에 여러 Zone을 배치하는 형태를 사용한다.

즉:

Node는 “어느 CPU와 가까운 메모리인가?”
Zone은 “이 주소 영역을 어떤 제약 아래 사용할 것인가?”

를 나타낸다고 볼 수 있다.

대표적인 Zone은 다음과 같다.

ZONE_DMA
낮은 physical address 영역
legacy DMA 장치 대응 목적
ZONE_DMA32
4GB 이하 주소 영역
32bit DMA 장치 대응
ZONE_NORMAL
일반적인 커널 메모리 영역
ZONE_MOVABLE
이동 가능한 페이지 위주로 사용하는 영역

또한 하나의 Zone 종류는 여러 Node에 걸쳐 존재할 수 있다.
예를 들어 NUMA 시스템에서는:

Node 0의 ZONE_NORMAL
Node 1의 ZONE_NORMAL

이 각각 별도로 존재한다.

따라서 커널은 NUMA locality(Node)와 physical address constraint(Zone)를 함께 사용하여 물리 메모리를 관리한다.

Zone은 단순한 주소 분류 구조가 아니다.

리눅스 page allocator는 실제로 Zone 단위로 동작하며,
메모리 할당 가능 여부, fallback, reclaim, compaction 역시
Zone을 기준으로 이루어진다.

다음 글에서는 실제 struct zone과 buddy allocator 코드를 통해
Zone이 실제로 어떻게 사용되는지 살펴본다.
