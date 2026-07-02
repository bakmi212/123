"use client";

import { useEffect, useState } from "react";

export default function AppConfigPage() {

    const [config, setConfig] = useState<any>(null);

    useEffect(() => {

        loadConfig();

    }, []);

    async function loadConfig() {

        const res = await fetch("/api/app-config");

        const json = await res.json();

        setConfig(json);

    }

    if (!config)
        return <div>Loading...</div>;

    return (

        <div className="max-w-3xl mx-auto space-y-6">

            <h1 className="text-3xl font-bold">

                App Configuration

            </h1>

            <div className="space-y-4">

                <div>

                    <label>

                        Banner URL

                    </label>

                    <input

                        className="w-full border rounded p-2"

                        value={config.banner.url}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                banner:{

                                    ...config.banner,

                                    url:e.target.value

                                }

                            })

                        }

                    />

                </div>

                <div>

                    <label>

                        Minimum Version

                    </label>

                    <input

                        className="w-full border rounded p-2"

                        value={config.minimum_version}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                minimum_version:e.target.value

                            })

                        }

                    />

                </div>

                <div>

                    <label>

                        Maintenance

                    </label>

                    <input

                        type="checkbox"

                        checked={config.maintenance}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                maintenance:e.target.checked

                            })

                        }

                    />

                </div>

                <div>

                    <label>

                        Popup Title

                    </label>

                    <input

                        className="w-full border rounded p-2"

                        value={config.popup.title}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                popup:{

                                    ...config.popup,

                                    title:e.target.value

                                }

                            })

                        }

                    />

                </div>

                <div>

                    <label>

                        Popup Message

                    </label>

                    <textarea

                        className="w-full border rounded p-2"

                        rows={5}

                        value={config.popup.message}

                        onChange={(e)=>

                            setConfig({

                                ...config,

                                popup:{

                                    ...config.popup,

                                    message:e.target.value

                                }

                            })

                        }

                    />

                </div>

                <button

                    onClick={save}

                    className="px-6 py-3 rounded bg-black text-white"

                >

                    Save

                </button>

            </div>

        </div>

    );

    async function save(){

        await fetch("/api/app-config",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify(config)

        });

        alert("Saved");

    }

}
