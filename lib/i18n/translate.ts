import { createElement, Fragment, type ReactNode } from "react";
import { count, elapsed, isoDate, percent } from "@/lib/format";
import { turkish } from "@/lib/i18n/messages";

export type Language = "en" | "tr";
export type Message = keyof typeof turkish;
export type Translator = {
  (message: Message, values?: readonly (string | number)[]): string;
  rich: (message: Message, values: readonly ReactNode[]) => ReactNode;
  known: (message: string, values?: readonly (string | number)[]) => string;
  count: (value: number) => string;
  decimal: (value: number, digits: number) => string;
  elapsed: (seconds: number) => string;
  isoDate: (seconds: number) => string;
  percent: (part: number, whole: number) => string;
};

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "tr";
}

export function createTranslator(language: Language): Translator {
  const messageText = (message: Message) => (language === "tr" ? turkish[message] : message);
  const translate = (message: Message, values: readonly (string | number)[] = []) =>
    messageText(message).replace(/\{(\d+)\}/g, (match, index: string) =>
      values[Number(index)] === undefined ? match : String(values[Number(index)])
    );

  return Object.assign(translate, {
    rich: (message: Message, values: readonly ReactNode[]) =>
      messageText(message)
        .split(/(\{\d+\})/)
        .map((part, index) => {
          const placeholder = /^\{(\d+)\}$/.exec(part);
          return createElement(
            Fragment,
            { key: index },
            placeholder ? values[Number(placeholder[1])] : part
          );
        }),
    known: (message: string, values?: readonly (string | number)[]) =>
      Object.hasOwn(turkish, message) ? translate(message as Message, values) : message,
    count: (value: number) => count(value, language),
    decimal: (value: number, digits: number) =>
      new Intl.NumberFormat(language === "tr" ? "tr-TR" : "en-US", {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
      }).format(value),
    elapsed: (seconds: number) => elapsed(seconds, language),
    isoDate: (seconds: number) => isoDate(seconds, language),
    percent: (part: number, whole: number) => percent(part, whole, language)
  });
}
