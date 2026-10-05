import { OrderDetail } from "@/components/order-detail";
export default function Page(props: { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; message?: string }> }) { return <OrderDetail role="admin" {...props} />; }
