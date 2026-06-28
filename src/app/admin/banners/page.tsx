import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function BannerPage() {

  const supabase = await createClient();

  const { data: banners } = await supabase

    .from("banners")

    .select("*")

    .order("sort_order");

  return (

    <div className="space-y-6">

      <div className="flex items-center justify-between">

        <div>

          <h1 className="text-3xl font-bold">

            Banner Manager

          </h1>

          <p className="text-gray-500 mt-1">

            Manage dashboard carousel banners.

          </p>

        </div>

        <Link

          href="/admin/banners/new"

          className="rounded-lg bg-black px-5 py-3 text-white hover:bg-neutral-800"

        >

          + Add Banner

        </Link>

      </div>

      <div className="overflow-hidden rounded-2xl border bg-white">

        <table className="w-full">

          <thead className="bg-neutral-100">

            <tr>

              <th className="px-4 py-3 text-left">

                Preview

              </th>

              <th className="px-4 py-3 text-left">

                Button URL

              </th>

              <th className="px-4 py-3 text-center">

                Duration

              </th>

              <th className="px-4 py-3 text-center">

                Order

              </th>

              <th className="px-4 py-3 text-center">

                Status

              </th>

              <th className="px-4 py-3 text-center">

                Action

              </th>

            </tr>

          </thead>

          <tbody>

            {banners?.map((banner) => (

              <tr

                key={banner.id}

                className="border-t"

              >

                <td className="px-4 py-4">

                  <img

                    src={banner.image_url}

                    alt="Banner"

                    className="h-20 w-44 rounded-lg object-cover border"

                  />

                </td>

                <td className="px-4 py-4">

                  <div className="max-w-sm truncate">

                    {banner.button_url}

                  </div>

                </td>

                <td className="px-4 py-4 text-center">

                  {banner.duration}s

                </td>

                <td className="px-4 py-4 text-center">

                  {banner.sort_order}

                </td>

                <td className="px-4 py-4 text-center">

                  {banner.is_active ? (

                    <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">

                      Active

                    </span>

                  ) : (

                    <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">

                      Disabled

                    </span>

                  )}

                </td>

                <td className="px-4 py-4">

                  <div className="flex justify-center gap-2">

                    <Link

                      href={`/admin/banners/${banner.id}`}

                      className="rounded-lg border px-3 py-2"

                    >

                      Edit

                    </Link>

                    <button

                      className="rounded-lg bg-red-600 px-3 py-2 text-white"

                    >

                      Delete

                    </button>

                  </div>

                </td>

              </tr>

            ))}

          </tbody>

        </table>

      </div>

    </div>

  );

}
