import { userAuthenticationCheck } from "@/app/actions/userAuthenticationCheck";
import SettingsPage from "@/components/domain/(authenticated)/settings/SettingsPage";

const Page = async () => {
  await userAuthenticationCheck();
  return <SettingsPage />;
};

export default Page;
