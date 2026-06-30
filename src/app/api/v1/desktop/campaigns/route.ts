import { NextResponse } from 'next/server'

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(

    process.env.NEXT_PUBLIC_SUPABASE_URL!,

    process.env.SUPABASE_SERVICE_ROLE_KEY!

)

export async function GET(request: Request) {

    try {

        const { searchParams } =

            new URL(request.url)

        const product =

            searchParams.get('product')

        if (!product) {

            return NextResponse.json({

                success:false,

                message:'Missing product.'

            },{

                status:400

            })

        }

        const { data,error } =

            await supabase.rpc(

                'get_desktop_campaigns',

                {

                    p_product_slug:product

                }

            )

        if(error)

            throw error

        return NextResponse.json({

            success:true,

            campaigns:data ?? []

        })

    }

    catch(err:any){

        return NextResponse.json({

            success:false,

            message:err.message

        },{

            status:500

        })

    }

}
