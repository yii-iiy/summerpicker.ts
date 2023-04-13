namespace Echoes
{
    export 
    const echoes =
    <T = {[key: string]: any},> (waves: {[key: string]: (env: T) => any})
    : T =>
        Object.entries(waves).reduce
        (
            (envs, [fn, f]) => ({... envs, [fn]: f(envs)}) ,
            {} as T
        ) ;
    
    export 
    const call = 
    <T extends Record<K, (...args: any) => any>, K extends keyof T>
    (obj: T, key: K): { [P in K]: ReturnType<T[P]>; }[K] =>
        echoes<{[P in K]: ReturnType<T[P]>}>(obj)[key] ;
    
} ;

const evaluators =
{
    pickitt: 
        (picker: {url: string, name: string, f: (d: Document) => PromiseLike<string>})
        : Promise<string> =>
        {
            return fetch(picker.url)
                .then
                ( response => response.text()
                , reject => `<!-- [ERROR] :${picker.name}: fetching '${picker.url}' got reject: ${reject} -->`
                )
                .then(codestext => (new DOMParser()).parseFromString(codestext,"text/html"))
                .then(picker.f)
                .catch(err => `<!-- [FAILED] :${picker.name}: job on '${picker.url}' failed: ${err} -->`)
        } ,
} ;

const summerweb =
{

    pickers: 
    {
        trino: 
        {
            docs: 
            {
                sitehost: "trino.io" , 
                mainpath: "docs/current/" , 
                pathespicker: 
                    (html: Document)
                    : PromiseLike<string[]> =>
                        Promise.resolve
                        (
                            Array.from( html.getElementsByClassName("reference internal") )
                                .map(element => element.getAttribute("href") ?? "")
                        ) ,
                perpicker: 
                    (document: Document, path: string)
                    : PromiseLike<string> => 
                        Promise.resolve
                        (
                            [ `<div path=${path} >`
                            , document.getElementsByClassName("md-container")[0].outerHTML
                            , document.getElementsByClassName("md-footer")[0].outerHTML
                            , "</div>" ] .reduce ( (x,y) => x+y )
                        ) ,
            } ,
        } ,
        
        ario: 
        {
            faq: 
            {
                sitehost: "ar-io.zendesk.com" ,
                mainpath: "/hc/en-us/sections/4900352839579-FAQ" ,
                pathespicker: {}
            }
        }
        
    } ,
    
    executors: 
    {
        
        /**
         * e.g.
         * 
         *   const perpagepicker = 
         *   {
         *       
         *   }
         *   perpagepick()
         */
        perpagepick: (env: { [key: string]: Function }) => 
            
            (perpagepicker: 
            {
                pathper: string, 
                pathmain: string, 
                f: (d: Document, p: string) => PromiseLike<string>
            })
            : Promise<string> =>
                evaluators.pickitt
                ({
                    url: `https://${perpagepicker.pathmain}/${perpagepicker.pathper}` ,
                    name: "perpagepick" ,
                    f: (d: Document) => 
                        perpagepicker.f(d,perpagepicker.pathper) ,
                }) ,
        
        summerpick: (env: { [key: string]: Function }) => 
            
            (summerpicker: 
            {
                sitehost: string, 
                mainpath: string, 
                pathespicker: (d: Document) => PromiseLike<string[]>, 
                perpicker: (d: Document, p: string) => PromiseLike<string> 
            })
            : Promise<string> => 
            {
                const perpagepick = env.perpagepick ;
                
                return evaluators.pickitt
                ({
                    url: `https://${summerpicker.sitehost}/${summerpicker.mainpath}` ,
                    name: "summerpick" ,
                    f: (d: Document) => 
                        summerpicker.pathespicker(d)
                            .then
                            (pathes =>
                                pathes.map(pathper => `${summerpicker.mainpath}/${pathper}`)
                                    .map(pathper => {return {pathper: pathper, pathmain: `${summerpicker.sitehost}`, f: summerpicker.perpicker}})
                                    .map(perpagepicker => perpagepick(perpagepicker))
                            )
                            .then(p => Promise.all(p) )
                            .then(p => p.reduce((x,y) => x+y))
                            .then(partsfull => ["<div path=docs/current/>",partsfull,"</div>"].reduce((x,y) => x+y))
                }) ;
            } ,
        
    }
}

const summerwebapp =
{
    meta: summerweb ,
    apps: 
    {
        trino: 
        {
            docs: () => Echoes.call(summerweb.executors,'summerpick')(summerweb.pickers.trino.docs) ,
            oth: () => {} ,
        } ,
        
        
    } ,
    
    tastes: 
    {
        pickitt:
        {
            play1: 
            {
                picker: (env: { [key: string]: any }) => 
                    
                    ({
                        name: 'test::develop/event-listener.html' ,
                        url: 'https://trino.io/docs/current/develop/event-listener.html' ,
                        f:  (d: Document) => summerweb.pickers.trino.docs.perpicker(d,'/docs/current/develop/event-listener.html')
                    }) ,
                
                f: (env: { [key: string]: any }) => 
                    
                    () => evaluators.pickitt(env.picker) ,
                    
            } ,
            oth: () => {} ,
        }
    }
}

// summerwebapp.apps.trino.docs().then(r => console.log(r))
// Echoes.call(summerwebapp.tastes.pickitt.play1,'f')().then(r => console.log(r))
