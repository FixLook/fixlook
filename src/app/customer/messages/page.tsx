import { MessageInbox } from "@/components/messages/pages";
export default function Page(props: { searchParams: Promise<{ error?: string; order?: string; page?: string }> }) { return <MessageInbox role="customer" {...props} />; }
