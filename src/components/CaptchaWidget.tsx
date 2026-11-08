"use client";
import ReCAPTCHA, { type ReCAPTCHAProps } from "react-google-recaptcha";
import type { Ref } from "react";

export default function CaptchaWidget({ instanceRef, ...props }: ReCAPTCHAProps & { instanceRef: Ref<ReCAPTCHA> }) {
  return <ReCAPTCHA ref={instanceRef} {...props} />;
}
