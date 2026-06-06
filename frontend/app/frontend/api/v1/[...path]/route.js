import { proxyAuthenticatedRequest } from '../../_lib/backend-auth';

export async function GET(request, context) {
    const params = await context.params;
    const path = params.path.join('/');
    const finalPath = path.endsWith('/') ? path : `${path}/`;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';
    
    return proxyAuthenticatedRequest(request, `/api/v1/${finalPath}${queryString}`);
}

export async function POST(request, context) {
    const params = await context.params;
    const path = params.path.join('/');
    const finalPath = path.endsWith('/') ? path : `${path}/`;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    let body = null;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
        body = await request.formData();
    } else if (contentType.includes('application/json')) {
        body = JSON.stringify(await request.json());
    } else {
        body = await request.text();
    }

    const headers = {};
    if (contentType && !contentType.includes('multipart/form-data')) {
        headers['Content-Type'] = contentType;
    }

    return proxyAuthenticatedRequest(request, `/api/v1/${finalPath}${queryString}`, {
        method: 'POST',
        headers,
        body,
    });
}

export async function PATCH(request, context) {
    const params = await context.params;
    const path = params.path.join('/');
    const finalPath = path.endsWith('/') ? path : `${path}/`;
    const { searchParams } = new URL(request.url);
    const queryString = searchParams.toString() ? `?${searchParams.toString()}` : '';

    let body = null;
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('multipart/form-data')) {
        body = await request.formData();
    } else if (contentType.includes('application/json')) {
        body = JSON.stringify(await request.json());
    } else {
        body = await request.text();
    }

    const headers = {};
    if (contentType && !contentType.includes('multipart/form-data')) {
        headers['Content-Type'] = contentType;
    }

    return proxyAuthenticatedRequest(request, `/api/v1/${finalPath}${queryString}`, {
        method: 'PATCH',
        headers,
        body,
    });
}
