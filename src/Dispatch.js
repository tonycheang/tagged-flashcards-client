async function dispatch(path, method, objectToStringify) {
    const cookies = document.cookie.split(";");

    let xsrfString;
    if (cookies) xsrfString = cookies.filter(cookie => cookie.trim().startsWith("xsrf-token="))[0];
    
    let xsrfToken;
    if (xsrfString) xsrfToken = xsrfString.split('=')[1];
    
    return fetch(path,
        {
            method,
            headers: { 
                'Content-Type': 'application/json',
                'xsrf-token': xsrfToken
            },
            body: JSON.stringify(objectToStringify)
        }
    );
}

async function dispatchWithRedirect(path, method, data, options) {
    options = options ? options : { };
    // By default, allow for a single redirect and a single retry of the original.
    options.maxDepth = options.maxDepth ? options.maxDepth : 3;
    options.returnResponsePath = options.returnResponsePath ? options.returnResponsePath : true;

    let originalIntent = { path, method, data };
    let suggestedRedirect = { };
    let responsePath = [];

    for (let i = 0; i < options.maxDepth; i++) {
        try {
            const attemptPath = suggestedRedirect.path ? suggestedRedirect.path : originalIntent.path;
            const attemptData = suggestedRedirect.data ? suggestedRedirect.data : originalIntent.data;
            const attemptMethod = suggestedRedirect.method ? suggestedRedirect.method : originalIntent.method;
            
            const latestRes = await dispatch(attemptPath, attemptMethod, attemptData);
            const latestBody = await latestRes.json();

            responsePath.push({ latestRes, body: latestBody });
            
            if (latestRes.status >= 200 && latestRes.status < 300) {
                if (attemptPath === originalIntent.path) {
                    return { 
                        body: latestBody, 
                        response: latestRes, 
                        responsePath: options.returnResponsePath ? responsePath : undefined, 
                        json: () => latestBody 
                    }
                }
                // Empty out suggestedRedirect.
                suggestedRedirect = {};
            }

            /* No support for 300 error codes currently. */

            // If no suggestion to redirect, simply exit.
            if (latestRes.status >= 400 && !latestBody.redirectURL) {
                return { 
                    body: latestBody, 
                    response: latestRes, 
                    responsePath: options.returnResponsePath ? responsePath : undefined, 
                    json: () => latestBody 
                }
            }

            // Check for a suggested redirect. If so, take it on the next iteration.
            if (latestBody && latestBody.error && latestBody.redirectURL) {
                suggestedRedirect.path = latestBody.redirectURL;
                suggestedRedirect.data = latestBody.data;
            }
        } catch (err) {
            throw err;
        }
    }

    const error = {
                    error: "MaximumDispatchesReached",
                    message: `dispatchTries failed ${method} on ${path} after ${options.maxDepth} times.`,
                    responsePath
                  }
    return error;
}

export { dispatch, dispatchWithRedirect };