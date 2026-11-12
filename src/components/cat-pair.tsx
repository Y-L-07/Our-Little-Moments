import Image from "next/image";

export type CatState = "idle" | "watching" | "covering" | "happy";

export default function CatPair({ state }: { state: CatState }) {
  return (
    <div className="cat-pair" data-testid="cats" data-state={state} data-motion="off" aria-hidden="true">
      <Image className="cat-art" src="/images/cats/cats-peeking.png" alt="" width={1536} height={1024} preload unoptimized />
      <Image className="cat-art cat-art-covered" src="/images/cats/cats-covering-eyes.png" alt="" width={1536} height={1024} unoptimized />
    </div>
  );
}
