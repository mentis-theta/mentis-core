import { lazy, ComponentType } from 'react';

export const lazyWithRetry = (
    componentImport: () => Promise<{ default: ComponentType<any> }>
) =>
    lazy(async () => {
        try {
            return await componentImport();
        } catch (error: unknown) {
            // Check if the error is related to a missing chunk (common after new deployments)
            const errObj = error as Record<string, any>;
            const isChunkLoadError =
                errObj?.message?.includes('Loading chunk') ||
                errObj?.message?.includes('Importing a module script failed') ||
                errObj?.name === 'ChunkLoadError';

            if (isChunkLoadError) {
                // Reload the page to fetch the new index.html and chunks
                // This is a hard reload to ensure we get fresh assets
                window.location.reload();

                // Return a never-resolving promise to keep the loading state 
                // while the page reloads
                return new Promise(() => { });
            }

            // If it's another error, re-throw
            throw error;
        }
    });
