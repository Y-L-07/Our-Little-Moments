import LoginForm from "@/components/login-form";

export default function Home() {
  return (
    <div className="scrapbook-page">
      <header className="page-header">
        <a className="wordmark" href="#main" aria-label="Our Little Moments，前往登录表单">
          <span className="brand-mark" aria-hidden="true">m.</span>
          <span>OUR LITTLE MOMENTS</span>
        </a>
        <span className="edition-label"><span aria-hidden="true" /> 两个人的小日子</span>
      </header>

      <main id="main" className="desk">
        <aside className="margin-note" aria-hidden="true">
          <span className="handwriting">Little things,<br />big love.</span>
          <svg className="note-arrow" viewBox="0 0 110 70" fill="none"><path d="M8 8c47-10 79 6 79 43m-13-12 14 14 9-18" /></svg>
        </aside>

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
