import React from "react";
import { ChatInputBar, type ChatInputBarVariant } from "../chat/ChatInputBar";

type Props = Omit<React.ComponentProps<typeof ChatInputBar>, "variant"> & {
  variant?: ChatInputBarVariant;
};

/** Inbox composer — defaults to `inbox` variant. */
export function PremiumComposer({ variant = "inbox", ...rest }: Props) {
  return <ChatInputBar variant={variant} {...rest} />;
}
