'use client';

import Image from 'next/image';

export default function Watermark() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-10 pointer-events-none flex justify-center pb-4">
      <div className="opacity-[0.08] select-none">
        <Image
          src="/watermark.png"
          alt=""
          width={200}
          height={200}
          className="object-contain"
          aria-hidden="true"
          priority={false}
        />
      </div>
    </div>
  );
}
