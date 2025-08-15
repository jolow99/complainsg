import { Button } from "../ui/button";
import { useRouter } from "next/navigation";

export default function PulseButton() {
  const router = useRouter();

  const handleClick = () => {
    router.push("/pulse");
  };

  return (
    <Button
      onClick={handleClick}
      className="bg-red-400 hover:bg-red-500 text-white font-bold py-2 px-4 rounded cursor-pointer"
    >
      Go to Pulse
    </Button>
  );
}
