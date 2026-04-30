import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({ component: App })

function App() {
  return (
    <main className="px-4 pb-8 pt-14">
            
            <section className="lg:col-span-5 glass-card rounded-[32px] p-xl shadow-[0_20px_60px_rgba(0,0,0,0.03)]">
                <h2 className="font-headline-md text-headline-md text-on-surface mb-xl">Macro Balance</h2>
                <div className="flex items-center justify-center relative py-6">
                    
                    <div className="w-48 h-48 rounded-full border-[16px] border-surface-container relative" style={{ background: 'conic-gradient(#334f2b 0% 30%, #5c5f5f 30% 70%, #afd0a1 70% 100%)' }}>
                        <div className="absolute inset-0 m-auto w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm">
                            <span className="material-symbols-outlined text-primary text-3xl" data-icon="restaurant">restaurant</span>
                        </div>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 mt-lg">
                    <div className="flex items-center justify-between p-md bg-white/40 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-primary"></div>
                            <span className="text-body-md font-body-md">Protein</span>
                        </div>
                        <span className="font-bold text-on-surface">92g / 30%</span>
                    </div>
                    <div className="flex items-center justify-between p-md bg-white/40 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-secondary"></div>
                            <span className="text-body-md font-body-md">Carbs</span>
                        </div>
                        <span className="font-bold text-on-surface">124g / 40%</span>
                    </div>
                    <div className="flex items-center justify-between p-md bg-white/40 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-inverse-primary"></div>
                            <span className="text-body-md font-body-md">Fats</span>
                        </div>
                        <span className="font-bold text-on-surface">41g / 30%</span>
                    </div>
                </div>
            </section>
    </main>
  )
}
