"use client";

import { useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import CatPair, { type CatState } from "./cat-pair";

const subscribeToHydration = () => () => {};

export default function LoginForm() {
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({ account: "", password: "" });
  const [message, setMessage] = useState("");
  const [catState, setCatState] = useState<CatState>("idle");
  const accountRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);

  function submitDemo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = {
      account: accountRef.current?.value.trim() ? "" : "请输入账号",
      password: passwordRef.current?.value ? "" : "请输入密码",
    };
    setErrors(nextErrors);
    setMessage("");
    if (nextErrors.account) accountRef.current?.focus();
    else if (nextErrors.password) passwordRef.current?.focus();
    else {
      event.currentTarget.reset();
      setShowPassword(false);
      setCatState(document.activeElement === passwordRef.current ? "covering" : "happy");
      setMessage("演示完成，未进行真实登录。输入内容已清空，故事等我们以后慢慢写。");
    }
  }

  return (
    <section className="login-scene" aria-labelledby="welcome-title">
      <div className="cat-stage"><CatPair state={catState} /></div>
      <div className="card-underlay" aria-hidden="true" />
      <div className="login-card" data-testid="login-card">
        <div className="card-topline" aria-hidden="true"><span>OUR STORY STARTS HERE</span><span>01 / ∞</span></div>
        <div className="welcome-copy">
          <span className="welcome-eyebrow">欢迎回到，我们的小世界</span>
          <h1 id="welcome-title">Our Little<br /><em>Moments</em><span className="title-heart" aria-hidden="true">♡</span></h1>
          <p>把平凡的日子，写成我们的故事。</p>
        </div>

        <form noValidate onSubmit={submitDemo} aria-describedby="prototype-notice" autoComplete="on">
          <fieldset disabled={!hydrated}>
          <div className="field">
            <label htmlFor="account">账号 <span aria-hidden="true">ACCOUNT</span></label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="8" r="3.2" /><path d="M5.5 20v-2.5a6.5 6.5 0 0 1 13 0V20" /></svg>
              <input ref={accountRef} id="account" name="account" type="text" autoComplete="username" autoCapitalize="none" spellCheck={false} required placeholder="用一个虚构昵称开始" aria-invalid={!!errors.account} aria-describedby={errors.account ? "account-error" : undefined} onFocus={() => setCatState("watching")} onBlur={() => setCatState("idle")} onChange={() => { setErrors(current => ({ ...current, account: "" })); setMessage(""); }} />
            </div>
            {errors.account && <p className="field-error" id="account-error" role="alert">{errors.account}</p>}
          </div>

          <div className="field password-field">
            <label htmlFor="password">密码 <span aria-hidden="true">PASSWORD</span></label>
            <div className="input-wrap">
              <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2.5" /><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 4v3" /></svg>
              <input ref={passwordRef} id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" required placeholder="仅输入演示密码" aria-invalid={!!errors.password} aria-describedby={errors.password ? "password-error" : undefined} onFocus={() => setCatState("covering")} onBlur={() => setCatState("idle")} onChange={() => { setErrors(current => ({ ...current, password: "" })); setMessage(""); }} />
              <button className="password-toggle" type="button" aria-label={showPassword ? "隐藏密码" : "显示密码"} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" /><circle cx="12" cy="12" r="2.5" />{showPassword && <path d="m4 3 16 18" />}</svg>
              </button>
            </div>
            <button className="text-button" type="button" onClick={() => setMessage("密码找回功能尚未接入。这是界面演示，没有真实账号。")}>忘记密码？</button>
            {errors.password && <p className="field-error" id="password-error" role="alert">{errors.password}</p>}
          </div>

          <button className="login-button" type="submit"><span>进入我们的小屋</span><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6" /></svg></button>
          </fieldset>
          <p className="feedback" role="status" aria-live="polite" aria-atomic="true">{message}</p>
        </form>
        <noscript><p className="field-error">请启用 JavaScript 后体验。表单已停用，不会发送输入内容。</p></noscript>

        <p className="space-note"><span aria-hidden="true">♡</span> 想留一方小天地，安放我们的小日子。</p>
        <div className="prototype-notice" id="prototype-notice"><span className="notice-label">原型说明</span><p>当前为界面演示，没有真实登录或隐私保护。<br /><strong>请勿输入真实账号和密码。</strong></p></div>
      </div>
      <p className="scene-caption">一页手账，两个人，和好多好多以后。</p>
    </section>
  );
}
