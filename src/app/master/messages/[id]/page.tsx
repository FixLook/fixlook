import { MessageThread } from "@/components/messages/pages";
export default function Page(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }> }) { return <MessageThread role="master" {...props} />; }
