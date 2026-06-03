import { Outlet, createRootRoute } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import '../styles.css'
import Header from '#/shared/components/Header.tsx';
import Footer from '#/shared/components/Footer.tsx';
import { TooltipProvider } from '#/shared/components/base/tooltip/Tooltip.tsx';
import { Toaster } from '#/shared/components/base/Toast.tsx';
import { useIsMobile } from '#/shared/hooks/use-media-query.ts';

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const isMobile = useIsMobile();
  return (
    <TooltipProvider>
      <Header />
      <Toaster position={isMobile ? 'bottom-center' : 'top-center'} />
      <Outlet />
      <Footer />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </TooltipProvider>
  )
}
