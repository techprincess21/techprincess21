import Workspace from "./Workspace";
import { VIEWS } from "@/lib/views";

export default function Page() {
  const adapter = (process.env.DATA_ADAPTER ?? "mock").toLowerCase();
  return <Workspace views={VIEWS} adapter={adapter} />;
}
