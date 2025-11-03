// types/pagination.ts
export type ServerResponse<T> = {
    data: T[];
    meta: {
        total: number;
        perPage: number;
        currentPage: number;
        lastPage: number;
    };
};

// Lo que deben devolver los repositorios/servicios al controlador
export type PageFetchResult<T> = {
    data: T[];
    total: number;
    page: number;      // 1-based
    pageSize: number;  // tamaño real usado por la consulta
};

export type ListParams<F extends Record<string, unknown> = Record<string, unknown>> = {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortDir?: 'asc' | 'desc' | undefined;
    search?: string;
    filters: Partial<F> & Record<string, unknown>;
};

export type Filters = {
    // búsqueda libre
    q?: string;
    search?: string;

    // filtros directos
    email?: string;
    status?: boolean | 'true' | 'false';
    role?: string;

    // rango de fechas (ej. por createdAt)
    createdAt?: { from?: string; to?: string };

    // ordenado opcional
    sortBy?: 'id' | 'email' | 'status' | 'createdAt' | 'updatedAt' | string;
    sortDir?: 'asc' | 'desc' | undefined;
};