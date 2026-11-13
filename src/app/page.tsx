import LoginForm from "@/components/login-form";

const stars = [[8, 13], [18, 8], [29, 22], [39, 9], [62, 11], [75, 6], [89, 17], [95, 35], [5, 43], [14, 62], [27, 72], [8, 86], [36, 89], [66, 87], [79, 75], [92, 88], [85, 53], [70, 32], [20, 43], [93, 64], [47, 6], [55, 93]];

export default function Home() {
  return (
    <div className="moonlight-page">
      <div className="night-sky" aria-hidden="true">
        {stars.map(([x, y], index) => <span key={index} className={index % 5 === 0 ? "star star-bright" : "star"} style={{ left: x + "%", top: y + "%" }} />)}
      </div>
      <main id="main" className="night-room">
        <aside className="moon-note" aria-hidden="true">
          <div className="crescent-moon" />
          <span className="night-caption">UNDER THE SAME MOON</span>
          <p>今晚的月色，<br />也想分你一半。</p>
          <span className="night-note-rule" />
          <span className="night-whisper">每个平凡的夜晚，都因你闪光。</span>
        </aside>
        <svg className="constellation constellation-left" viewBox="0 0 220 150" fill="none" aria-hidden="true">
          <path d="m12 112 55-59 47 29 44-63 49 43" />
          <circle cx="12" cy="112" r="2" /><circle cx="67" cy="53" r="3" /><circle cx="114" cy="82" r="2" /><circle cx="158" cy="19" r="3" /><circle cx="207" cy="62" r="2" />
        </svg>
        <LoginForm />
        <aside className="night-letter" aria-hidden="true">
          <span className="letter-star">✧</span>
          <span className="night-caption">A LITTLE LIGHT, JUST FOR US</span>
          <p>把今天的温柔，<br />留给明天的我们。</p>
          <span className="handwriting">You, me &amp; the moon.</span>
          <div className="moon-phases"><i /><i /><i /><i /><i /></div>
        </aside>
        <svg className="constellation constellation-right" viewBox="0 0 220 150" fill="none" aria-hidden="true">
          <path d="m14 30 58 24 40 68 54-53 38 17" />
          <circle cx="14" cy="30" r="2" /><circle cx="72" cy="54" r="3" /><circle cx="112" cy="122" r="2" /><circle cx="166" cy="69" r="3" /><circle cx="204" cy="86" r="2" />
        </svg>
      </main>
      <footer className="page-footer">
        <span>月光作伴，慢慢相爱。</span>
        <span className="footer-line" aria-hidden="true" />
        <span className="handwriting">Every night, a little closer.</span>
      </footer>
    </div>
  );
}
