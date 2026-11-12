import Image from "next/image";
import LoginForm from "@/components/login-form";

export default function Home() {
  return (
    <div className="scrapbook-page">
      <main id="main" className="desk">
        <div className="desk-paper desk-paper-grid" aria-hidden="true" />
        <div className="desk-paper desk-paper-rose" aria-hidden="true" />
        <aside className="margin-note" aria-hidden="true">
          <span className="handwriting">Little things,<br />big love.</span>
          <svg className="note-arrow" viewBox="0 0 110 70" fill="none"><path d="M8 8c47-10 79 6 79 43m-13-12 14 14 9-18" /></svg>
        </aside>

        <div className="desk-detail daily-note" aria-hidden="true">
          <span className="paper-clip" />
          <span className="note-caption">LITTLE JOYS</span>
          <p>今天的小幸福</p>
          <span className="joy-line">一起吃早餐</span>
          <span className="joy-line">散步时牵手</span>
          <span className="joy-line">分享一件小事</span>
        </div>

        <div className="desk-detail morning-photo" aria-hidden="true">
          <span className="paper-tape" />
          <Image src="/images/scrapbook/slow-morning.png" alt="" width={1536} height={1024} sizes="144px" />
          <span className="handwriting">a slow morning, with you.</span>
        </div>

        <div className="keepsake keepsake-left" aria-hidden="true">
          <span className="paper-tape" />
          <div className="botanical-print">
            <svg viewBox="0 0 150 170" fill="none">
              <path className="stem" d="M69 153c6-36-1-72 14-119M76 101 48 77m29 3 31-28M73 124l31-20" />
              <path className="leaf" d="M77 78C53 77 46 55 51 45c23 3 30 19 26 33Zm4-22c-9-19-2-35 10-39 10 18 3 32-10 39ZM76 103c16-27 34-26 42-20-6 22-23 27-42 20Zm-4 24c-27-1-36-19-33-29 23-4 36 11 33 29Z" />
            </svg>
          </div>
          <span className="handwriting">grow together.</span>
        </div>

        <LoginForm />

        <div className="keepsake keepsake-right" aria-hidden="true">
          <span className="paper-tape" />
          <span className="note-caption">NOTE TO US</span>
          <p>有你在，<br />平凡也闪闪发光。</p>
          <svg className="little-heart" viewBox="0 0 48 42" fill="none"><path d="M24 36C17 30 5 21 6 13 7 2 20 3 24 11c4-8 17-9 18 2 1 8-11 17-18 23Z" /></svg>
        </div>

        <div className="keepsake-stamp" aria-hidden="true">
          <span>JUST US</span>
          <svg viewBox="0 0 70 40" fill="none"><path d="M35 33C27 27 13 19 14 11c1-9 16-10 21 0 5-10 20-9 21 0 1 8-13 16-21 22Z" /><path d="M4 20h10m42 0h10M7 26h11m34 0h11" /></svg>
          <span className="handwriting">with love</span>
        </div>

        <div className="desk-detail together-ticket" aria-hidden="true">
          <div><span className="note-caption">FOR THE TWO OF US</span><p>一起，慢慢走。</p></div>
          <span className="ticket-stub">02<span>ADMIT TWO</span></span>
        </div>
        <span className="desk-detail tiny-label" aria-hidden="true">把日子过成喜欢的样子</span>
        <div className="desk-detail round-sticker" aria-hidden="true"><span>made of</span><span className="handwriting">little things</span><span>♡</span></div>
        <svg className="desk-detail thread-left" viewBox="0 0 100 180" fill="none" aria-hidden="true"><path d="M68 5C-7 39 19 93 58 99c47 8 22-44-5-17-29 30-10 62-28 91" /></svg>
        <svg className="desk-detail thread-right" viewBox="0 0 250 85" fill="none" aria-hidden="true"><path d="M5 33c44-45 95 57 151 22 26-16-14-41-22-17-8 27 56 28 108-23" /></svg>

        <span className="desk-spark spark-one" aria-hidden="true">✧</span>
        <span className="desk-spark spark-two" aria-hidden="true">✧</span>
      </main>

      <footer className="page-footer">
        <span>慢慢记录，好好相爱。</span>
        <span className="footer-line" aria-hidden="true" />
        <span className="handwriting">Every day, a little closer.</span>
      </footer>
    </div>
  );
}
