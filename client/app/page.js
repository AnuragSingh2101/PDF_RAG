import Upload from "./components/fileUpload"
import Chat from "./components/chat";

export default function Home() {
  return (
    <div>
      <div className="min-h-screen w-screen flex">
        <div className="w-[30vw] flex items-center justify-center">
          <Upload/>
        </div>
        <div className="w-[70vw] flex items-center justify-center">
          <Chat/>
        </div>
      </div>
    </div>
  );
}
