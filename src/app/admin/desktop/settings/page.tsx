'use client'

import { useEffect, useState } from 'react'

import { createBrowserClient } from '@/lib/supabase/client'

import { Switch } from '@/components/ui/switch'

import { Button } from '@/components/ui/button'

import { Input } from '@/components/ui/input'

import { toast } from 'sonner'

const supabase = createBrowserClient()

export default function DesktopSettingsPage() {

    const [loading,setLoading]=useState(true)

    const [saving,setSaving]=useState(false)

    const [config,setConfig]=useState<any>({})

    useEffect(()=>{

        load()

    },[])

    async function load(){

        const {data}=await supabase

        .from('desktop_settings')

        .select('id,setting_value')

        .eq('setting_key','remote_config')

        .single()

        setConfig(data?.setting_value||{})

        setLoading(false)

    }

    async function save(){

        setSaving(true)

        const {error}=await supabase

        .from('desktop_settings')

        .update({

            setting_value:config,

            updated_at:new Date().toISOString()

        })

        .eq('setting_key','remote_config')

        if(error){

            toast.error(error.message)

        }else{

            toast.success('Settings saved.')

        }

        setSaving(false)

    }

    if(loading){

        return <div>Loading...</div>

    }

    return(

        <div className="max-w-3xl space-y-6">

            <h1 className="text-3xl font-bold">

                Desktop Settings

            </h1>

            <div className="rounded-xl border p-6 space-y-6">

                <SettingSwitch

                    title="Banner"

                    value={config.banner_enabled}

                    onChange={(v)=>

                        setConfig({

                            ...config,

                            banner_enabled:v

                        })

                    }

                />

                <SettingSwitch

                    title="Popup"

                    value={config.popup_enabled}

                    onChange={(v)=>

                        setConfig({

                            ...config,

                            popup_enabled:v

                        })

                    }

                />

                <SettingSwitch

                    title="Announcement"

                    value={config.announcement_enabled}

                    onChange={(v)=>

                        setConfig({

                            ...config,

                            announcement_enabled:v

                        })

                    }

                />

                <SettingSwitch

                    title="Maintenance"

                    value={config.maintenance}

                    onChange={(v)=>

                        setConfig({

                            ...config,

                            maintenance:v

                        })

                    }

                />

                <SettingSwitch

                    title="Force Update"

                    value={config.force_update}

                    onChange={(v)=>

                        setConfig({

                            ...config,

                            force_update:v

                        })

                    }

                />

                <div>

                    <label>

                        Minimum Version

                    </label>

                    <Input

                        value={config.min_version||''}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                min_version:e.target.value

                            })

                        }

                    />

                </div>

                <div>

                    <label>

                        Latest Version

                    </label>

                    <Input

                        value={config.latest_version||''}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                latest_version:e.target.value

                            })

                        }

                    />

                </div>

                <Button

                    disabled={saving}

                    onClick={save}

                >

                    Save Settings

                </Button>

            </div>

        </div>

    )

}

function SettingSwitch({

title,

value,

onChange,

}:any){

return(

<div className="flex items-center justify-between">

<div>

<div className="font-medium">

{title}

</div>

</div>

<Switch

checked={value}

onCheckedChange={onChange}

/>

</div>

)

}
