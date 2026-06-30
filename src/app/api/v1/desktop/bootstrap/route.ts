import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {

  try {

    const { searchParams } = new URL(request.url)

    const product = searchParams.get('product')

    if (!product) {

      return NextResponse.json(
        {
          success: false,
          message: 'Missing product.'
        },
        { status: 400 }
      )

    }

    const { data: campaigns } =

      const { data: remoteConfig } =

        await supabase
    
        .from('desktop_settings')
    
        .select('setting_value')
    
        .eq('setting_key','remote_config')
    
        .single()
        
      await supabase.rpc(
        'get_desktop_campaigns',
        {
          p_product_slug: product
        }
      )

    return NextResponse.json({

      success: true,

      bootstrap: {

          campaigns: campaigns ?? [],
      
          remote_config:
      
              remoteConfig?.setting_value ?? {},
      
          news: [],
      
      }

    })

  }

  catch (err: any) {

    return NextResponse.json({

      success: false,

      message: err.message

    }, {

      status: 500

    })

  }

}
