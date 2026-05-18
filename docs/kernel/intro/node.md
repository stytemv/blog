---
sidebar_label: "node"
sidebar_position: 1
---

# node

<div align="center">
  <img src="/img/linux_memory/numa/numa.png" width="700"/>
  <p><em>Figure 1. NUMA architecture overview</em></p>
</div>

초기의 컴퓨터 시스템에서는 하나의 CPU 패키지(socket) 안에 여러 개의 CPU 코어(core)가 존재하고, 이 코어들이 하나의 메모리 공간(RAM)을 공유하는 구조가 일반적이었습니다. 이러한 구조에서는 어떤 코어가 메모리에 접근하더라도 접근 비용이 거의 동일했으며, 이를 UMA(Uniform Memory Access) 구조라고 부릅니다.

예를 들어 같은 CPU 소켓 내부에 존재하는:

- Core 0이 메모리에 접근
- Core 3이 메모리에 접근

하는 경우, 둘 사이의 메모리 접근 latency 차이는 거의 존재하지 않습니다.

하지만 CPU 소켓 개수가 증가하는 서버 환경에서는 문제가 발생합니다. 모든 코어가 하나의 메모리 컨트롤러와 메모리 버스를 공유하게 되면:

- 메모리 병목 증가
- memory bandwidth 경쟁 증가

등의 문제가 발생하게 됩니다.

이를 해결하기 위해 등장한 구조가 NUMA(Non-Uniform Memory Access)입니다.

NUMA에서는 각 CPU 소켓이 자신의 로컬 메모리(local memory)를 직접 가집니다. 따라서:

Socket 0의 코어들은 Memory 0 접근이 빠르고
Socket 0의 코어들이 Memory 1 접근은 상대적으로 느립니다.

즉 local memory access는 빠르고 remote memory access는 느립니다.

remote memory access의 경우 다른 소켓의 memory controller를 거쳐야 하기 때문에 latency가 증가하게 됩니다. 이것이 UMA와 NUMA의 가장 큰 구조적 차이입니다.

Linux 커널은 이러한 NUMA 구조를 관리하기 위해 Node라는 개념을 사용합니다.

여기서 node는 단순한 메모리 블록이 아니라:

하나의 CPU 소켓과 그 소켓에 가까운 메모리 영역을 묶은 locality 단위

라고 볼 수 있습니다.

Linux에서는 각 node를 struct pglist_data (pg_data_t) 구조체로 관리하며, 각 node는:

- 자신만의 메모리 영역
- zone 정보
- free page 상태
- buddy allocator 정보

등을 독립적으로 가집니다.

메모리 할당 시 Linux는 NUMA locality를 최대한 유지하려고 합니다. 예를 들어 어떤 스레드가 특정 코어에서 실행 중이라면, 커널은 우선 현재 CPU와 가까운 node의 메모리 할당을 시도합니다.

locality를 무시한 채 remote node의 메모리에 반복적으로 접근하게 되면 성능 저하가 발생할 수 있습니다.서버 환경 등에서는 NUMA awareness가 매우 중요하게 취급됩니다.

다만 일반적인 데스크탑이나 노트북 환경, 특히 이 글에서 다루는 일반적인 x86_64 기반 PC에서는 대부분 단일 소켓(single socket) 구조를 사용합니다.
따라서 Linux에서도 보통 NUMA node는 하나만 존재합니다.

하지만 Linux 커널 내부 메모리 관리 구조 자체는 NUMA를 기준으로 설계되어 있기 때문에, 단일 node 시스템에서도 동일한 node abstraction을 그대로 사용합니다.

또한 NUMA 구조에서 중요한 점은 단순히 “CPU마다 가까운 메모리가 존재한다” 가 아니라, 실제 물리 주소 범위 자체가 node 단위로 나뉘어 관리된다는 점입니다.

예를 들어 NUMA 시스템에서는 특정 physical address 범위가 특정 node의 RAM에 대응될 수 있습니다.

다만 이는 virtual address 기준이 아니라 physical memory 기준입니다.

따라서 동일한 virtual address라도 어떤 physical page에 매핑되느냐에 따라 서로 다른 node의 메모리를 사용할 수 있습니다.

Linux 커널은 부팅 과정에서 ACPI SRAT 등의 firmware 정보를 통해:

어떤 physical address range가 어느 NUMA node에 속하는가

를 전달받고, 이를 기반으로 node 구조와 메모리 관리 계층을 초기화합니다.
