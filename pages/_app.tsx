import '../styles/login.css';
import '../styles/manager.css';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useInstallBackTrap } from '../lib/backNav';

// Tracks the tallest height we've ever measured for this page instance —
// i.e. the viewport height with the keyboard CLOSED. We need this as a
// fixed baseline because the old approach (comparing window.innerHeight
// to visualViewport.height on every call) silently breaks once the
// <meta viewport> below sets `interactive-widget=resizes-content`: that
// setting makes the browser shrink window.innerHeight itself the moment
// the keyboard opens, so window.innerHeight and visualViewport.height
// shrink together and their difference stays near 0 — `keyboard-open`
// then never (reliably) turns on, even though the keyboard is visibly
// open. Comparing against a remembered "keyboard closed" baseline instead
// works the same regardless of which resize mode the browser is using.
let maxSeenHeight = 0;

function applyVisualViewportHeight() {
  if (typeof window === 'undefined') return;
  const vv = window.visualViewport;
  const h = vv ? vv.height : window.innerHeight;
  document.documentElement.style.setProperty('--vh', `${h * 0.01}px`);
  document.documentElement.style.setProperty('--app-height', `${h}px`);

  // Refresh the baseline on rotation/resize when we're clearly at full
  // height (nothing shrinking it), so orientation changes and dynamic
  // browser chrome (URL bar show/hide) don't get mistaken for a keyboard.
  if (h > maxSeenHeight) maxSeenHeight = h;

  const shrink = maxSeenHeight - h;
  document.documentElement.classList.toggle('keyboard-open', shrink > 120);
}

function applyMobileClass() {
  if (typeof window === 'undefined') return;
  const ua = navigator.userAgent || '';
  const isMobileUA = /Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua);
  const isTabletUA = /iPad|Tablet/i.test(ua);
  const isNarrow = window.innerWidth <= 900;
  const isMobile = isMobileUA || isNarrow;
  document.documentElement.classList.toggle('is-mobile', isMobile);
  document.documentElement.classList.toggle('is-tablet', isTabletUA);
}

// Display mode note: public/manifest.json now declares `"display":
// "standalone"` instead of `"fullscreen"`. "fullscreen" puts Android into
// true immersive mode (hides status bar + nav bar completely), and in that
// mode Chrome's own keyboard accessory bar (the autofill suggestions strip)
// is known to be positioned using the wrong/stale window insets — it can
// render floating mid-screen instead of docking above the keyboard, because
// the OS-level inset math immersive mode relies on doesn't get recalculated
// correctly when a text field is focused. "standalone" keeps normal
// (non-immersive) system UI insets, which is what lets Chrome anchor the
// accessory bar to the keyboard correctly — confirmed this fixed the
// floating bar. But standalone alone shows the system status bar, so it's
// no longer visually fullscreen. See installFocusAwareFullscreen() below
// for how fullscreen is restored via the JS Fullscreen API without
// reintroducing the immersive-mode/keyboard conflict.

// next-pwa registers the service worker with skipWaiting+clients.claim,
// but that alone does NOT refresh an already-open page. A new SW version
// can finish installing and even take control mid-session while the
// current tab keeps running on JS/CSS it already fetched under the OLD
// version. The user then has to fully close and reopen the app (sometimes
// twice) before they're actually looking at the new build — which is why
// a CSS fix can look like it "did nothing" even though it deployed fine.
// This forces a one-time automatic reload the moment a new SW takes over,
// so the very next paint is guaranteed to use the latest assets.
function installServiceWorkerAutoReload() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
  let reloading = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    window.location.reload();
  });
}

// --- Fullscreen, take two -------------------------------------------------
// The old version called requestFullscreen() on every tap, with no idea
// whether that tap had just focused a text field. So the exact same tap
// that opened the keyboard could also be re-locking immersive fullscreen —
// a race, and the root cause of the floating autofill bar (immersive mode's
// window insets don't get recalculated correctly while that race is
// happening).
//
// This version is aware of focus state at all times, so it never overlaps
// fullscreen-toggling with the keyboard being open or opening:
//   - the instant a form field is about to receive focus, exit fullscreen
//     FIRST (before the keyboard has any chance to appear under immersive
//     insets) — the keyboard then opens under normal standalone insets,
//     same as the working "standalone" build, so the autofill bar docks
//     correctly.
//   - fullscreen is only re-requested after a field is blurred AND no other
//     field has taken focus AND we've given the keyboard-close animation
//     time to settle — never speculatively, never on a bare tap.
function isFormField(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (el as HTMLElement).isContentEditable;
}

function tryEnterFullscreen() {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) return;
  if (isFormField(document.activeElement)) return;
  document.documentElement.requestFullscreen?.().catch(() => {
    // Ignored: the API requires a user gesture and can reject silently
    // (e.g. right after a fullscreenchange event on some Android builds).
    // That's fine — the next tap will try again.
  });
}

function tryExitFullscreen() {
  if (typeof document === 'undefined') return;
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
  }
}

function installFocusAwareFullscreen() {
  if (typeof document === 'undefined') return;

  // Exit immediately, before the keyboard opens — this fires on focus
  // capture, ahead of the keyboard animation.
  const onFocusIn = (e: FocusEvent) => {
    if (isFormField(e.target as Element)) tryExitFullscreen();
  };

  // Re-enter only once focus has actually left every field. A short delay
  // lets the keyboard-closing animation (and the next field's focusin, if
  // the user tapped "next" instead of dismissing the keyboard) settle
  // first, so tabbing between fields never toggles fullscreen mid-typing.
  const onFocusOut = () => {
    window.setTimeout(() => {
      if (!isFormField(document.activeElement)) tryEnterFullscreen();
    }, 300);
  };

  // First entry needs a user gesture (the API rejects calls with none) and
  // only fires when the tap isn't itself focusing a field.
  const onFirstGesture = (e: Event) => {
    if (!isFormField(e.target as Element)) tryEnterFullscreen();
  };

  document.addEventListener('focusin', onFocusIn);
  document.addEventListener('focusout', onFocusOut);
  document.addEventListener('click', onFirstGesture);

  return () => {
    document.removeEventListener('focusin', onFocusIn);
    document.removeEventListener('focusout', onFocusOut);
    document.removeEventListener('click', onFirstGesture);
  };
}

export default function App({ Component, pageProps }: AppProps) {
  useInstallBackTrap();
  const router = useRouter();
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    const start = () => setNavigating(true);
    const done = () => setNavigating(false);
    router.events.on('routeChangeStart', start);
    router.events.on('routeChangeComplete', done);
    router.events.on('routeChangeError', done);
    return () => {
      router.events.off('routeChangeStart', start);
      router.events.off('routeChangeComplete', done);
      router.events.off('routeChangeError', done);
    };
  }, [router]);

  useEffect(() => {
    applyMobileClass();
    applyVisualViewportHeight();
    installServiceWorkerAutoReload();
    const removeFullscreenListeners = installFocusAwareFullscreen();

    const vv = window.visualViewport;
    window.addEventListener('resize', applyMobileClass);
    window.addEventListener('orientationchange', applyMobileClass);
    window.addEventListener('resize', applyVisualViewportHeight);
    window.addEventListener('orientationchange', applyVisualViewportHeight);
    vv?.addEventListener('resize', applyVisualViewportHeight);
    vv?.addEventListener('scroll', applyVisualViewportHeight);

    return () => {
      window.removeEventListener('resize', applyMobileClass);
      window.removeEventListener('orientationchange', applyMobileClass);
      window.removeEventListener('resize', applyVisualViewportHeight);
      window.removeEventListener('orientationchange', applyVisualViewportHeight);
      vv?.removeEventListener('resize', applyVisualViewportHeight);
      vv?.removeEventListener('scroll', applyVisualViewportHeight);
      removeFullscreenListeners?.();
    };
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563EB" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      </Head>
      <Component {...pageProps} />
      {navigating && (
        <div
          style={{
            position: 'fixed', inset: 0,
            backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
            background: 'transparent',
            zIndex: 99999,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          <div style={{ width: 40, height: 40, borderRadius: '50%', border: '4px solid rgba(37,99,235,0.25)', borderTopColor: '#2563EB', animation: 'appNavSpin .8s linear infinite' }} />
          <style>{`@keyframes appNavSpin{to{transform:rotate(360deg)}}`}</style>
        </div>
      )}
    </>
  );
}
