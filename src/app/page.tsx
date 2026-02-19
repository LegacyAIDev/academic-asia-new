import Image from "next/image";
import {cookies} from "next/headers";
import {createClient} from "@/lib/supabase/server";

export default async function Home() {
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    const test = await supabase.from('students').select()

    const { data, error } = await supabase
        .from('students')
        .select()

    console.log(data);
    console.log(error);
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-between py-32 px-16 bg-white dark:bg-black sm:items-start">
       sads
      </main>
    </div>
  );
}
