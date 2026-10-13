/* Generated from contracts/openapi.yaml by scripts/gen.mjs. Do not edit. */
export interface paths {
    "/healthz": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Report service health. */
        get: operations["getHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/auth/dev-token": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Issue a development bearer token for an email address.
         * @description Development only. Do not expose this route in production.
         */
        post: operations["createDevToken"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tenants": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Create a tenant. The caller becomes its owner. */
        post: operations["createTenant"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tenants/{tenantId}/projects": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The tenant identifier. */
                tenantId: components["parameters"]["TenantId"];
            };
            cookie?: never;
        };
        /** List the projects of a tenant, newest first. */
        get: operations["listProjects"];
        put?: never;
        /** Create a project in a tenant. Requires the admin or owner role. */
        post: operations["createProject"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/v1/tenants/{tenantId}/projects/{projectId}": {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The tenant identifier. */
                tenantId: components["parameters"]["TenantId"];
                /** @description The project identifier. */
                projectId: components["parameters"]["ProjectId"];
            };
            cookie?: never;
        };
        /** Get one project of a tenant. */
        get: operations["getProject"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export interface webhooks {
    projectRequested: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Receive a project.requested event signed with the webhook secret.
         * @description The signature is the hex HMAC-SHA256 of the raw request body, keyed by
         *     the webhook secret, prefixed with `sha256=`.
         */
        post: operations["receiveProjectRequested"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export interface components {
    schemas: {
        Health: {
            /** @constant */
            status: "ok";
        };
        DevTokenRequest: {
            /** Format: email */
            email: string;
        };
        Token: {
            token: string;
        };
        CreateTenantRequest: {
            name: string;
        };
        Tenant: {
            /** Format: uuid */
            id: string;
            name: string;
        };
        CreateProjectRequest: {
            name: string;
        };
        Project: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            tenant_id: string;
            name: string;
            /** Format: date-time */
            created_at: string;
        };
        ProjectList: {
            items: components["schemas"]["Project"][];
        };
        ProjectRequestedEvent: {
            id: string;
            /** @constant */
            type: "project.requested";
            /** Format: date-time */
            created_at: string;
            /** Format: uuid */
            tenant_id: string;
            data: {
                name: string;
            };
        };
        Error: {
            error: string;
            message: string;
        };
    };
    responses: {
        /** @description The request body or parameters are invalid (invalid_request). */
        BadRequest: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The bearer token is missing or unknown (unauthorized). */
        Unauthorized: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The caller's role is too low for this operation (forbidden). */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The resource does not exist or the caller is not a member (not_found). */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description A resource with the same name already exists (conflict). */
        Conflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Too many requests (rate_limited). */
        RateLimited: {
            headers: {
                /** @description Seconds to wait before retrying. */
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        /** @description The tenant identifier. */
        TenantId: string;
        /** @description The project identifier. */
        ProjectId: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    getHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The service is healthy. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Health"];
                };
            };
        };
    };
    createDevToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DevTokenRequest"];
            };
        };
        responses: {
            /** @description A bearer token was issued. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Token"];
                };
            };
            400: components["responses"]["BadRequest"];
        };
    };
    createTenant: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTenantRequest"];
            };
        };
        responses: {
            /** @description The tenant was created. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Tenant"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            429: components["responses"]["RateLimited"];
        };
    };
    listProjects: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The tenant identifier. */
                tenantId: components["parameters"]["TenantId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The projects of the tenant. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ProjectList"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    createProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The tenant identifier. */
                tenantId: components["parameters"]["TenantId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateProjectRequest"];
            };
        };
        responses: {
            /** @description The project was created. */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            400: components["responses"]["BadRequest"];
            401: components["responses"]["Unauthorized"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["Conflict"];
            429: components["responses"]["RateLimited"];
        };
    };
    getProject: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                /** @description The tenant identifier. */
                tenantId: components["parameters"]["TenantId"];
                /** @description The project identifier. */
                projectId: components["parameters"]["ProjectId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The project. */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Project"];
                };
            };
            401: components["responses"]["Unauthorized"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["RateLimited"];
        };
    };
    receiveProjectRequested: {
        parameters: {
            query?: never;
            header: {
                /** @description `sha256=` followed by the hex HMAC-SHA256 of the raw body. */
                "X-PolyApp-Signature": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ProjectRequestedEvent"];
            };
        };
        responses: {
            /** @description The event was accepted. */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["Unauthorized"];
            /** @description The event body failed validation. */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
}
