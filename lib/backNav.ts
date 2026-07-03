import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';

type CloseFn = () => void;
const layerStack: CloseFn[] = [];

/**
 * ثبّت مصيدة الرجوع مرة واحدة في _app.tsx.
 * بنستخدم router.beforePopState اللي هي الطريقة الرسمية في Next.js
 * (Pages Router) للتحكم في زر/سحبة الرجوع، عشان نمنع نكست من إنها
 * تحاول تعمل تنقل/ريفريش هي كمان على نفس الحركة (وده اللي كان بيسبب
 * الريفريش). أي رجوع بيتلقطه إحنا: لو فيه مودال/قائمة مفتوحة بتتقفل،
 * ولو مفيش بنفضل في نفس الصفحة من غير ما التطبيق يقفل أو يعمل ريفريش.
 */
export function useInstallBackTrap() {
  const router = useRouter();

  useEffect(() => {
    // نضمن إن فيه حالة إضافية في الـ history من أول ما التطبيق يفتح
    window.history.pushState({ __trap: true }, '', window.location.href);

    router.beforePopState(() => {
      // نرجّع حالة تانية على طول عشان أي رجوع بعد كده يتلقطه إحنا برضه
      window.history.pushState({ __trap: true }, '', window.location.href);

      const closeTop = layerStack[layerStack.length - 1];
      if (closeTop) closeTop();

      // نمنع Next.js من إنه يعمل أي تنقل/ريفريش لنفسه
      return false;
    });

    return () => {
      router.beforePopState(() => true);
    };
  }, [router]);
}

/**
 * سجّل طبقة (مودال/قائمة جانبية) كمفتوحة عشان زر الرجوع يقفلها هي
 * الأول قبل أي حاجة تانية.
 * useBackClose(isOpen, closeFn)
 */
export function useBackClose(isOpen: boolean, closeFn: () => void) {
  const ref = useRef(closeFn);
  ref.current = closeFn;

  useEffect(() => {
    if (!isOpen) return;
    const fn = () => ref.current();
    layerStack.push(fn);
    return () => {
      const idx = layerStack.lastIndexOf(fn);
      if (idx !== -1) layerStack.splice(idx, 1);
    };
  }, [isOpen]);
}
