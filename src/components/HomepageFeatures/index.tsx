import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import Link from "@docusaurus/Link"; // 클릭 기능을 위해 추가
import styles from "./styles.module.css";

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<"svg">>;
  description: ReactNode;
  to: string; // 이동할 경로 추가
};

const FeatureList: FeatureItem[] = [
  {
    title: "Linux Kernel",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    to: "/docs/kernel/", // 본인이 만든 파일 경로로 수정
    description: (
      <>
        리눅스 커널의 메모리 관리 및 내부 동작 원리를 공부하고 정리한
        기록입니다.
      </>
    ),
  },
  {
    title: "eBPF",
    Svg: require("@site/static/img/undraw_docusaurus_tree.svg").default,
    to: "/docs/ebpf/",
    description: <>eBPF 공부 기록입니다.</>,
  },
  {
    title: "Personal Projects",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    to: "/docs/projects/", // 실제 파일 경로에 맞춰 수정
    description: <>개인 프로젝트를 기록한 아카이브입니다.</>,
  },
  {
    title: "ELF 파일 분석",
    Svg: require("@site/static/img/undraw_docusaurus_mountain.svg").default,
    to: "/docs/executable-and-linkable-format/",
    description: (
      <>리눅스 실행 파일 형식인 ELF의 구조와 로딩 과정을 정리합니다.</>
    ),
  },
  {
    title: "Compiler",
    Svg: require("@site/static/img/undraw_docusaurus_react.svg").default,
    to: "/docs/compiler/",
    description: <>Compiler 공부 기록입니다.</>,
  },
];

function Feature({ title, Svg, description, to }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <Link to={to} className={styles.featureLink}>
        <div className="text--center">
          <Svg className={styles.featureSvg} role="img" />
        </div>
        <div className="text--center padding-horiz--md">
          <Heading as="h3">{title}</Heading>
          <p>{description}</p>
        </div>
      </Link>
    </div>
  );
}

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className="row">
          {FeatureList.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
