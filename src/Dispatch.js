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

async function dispatchTries(path, method, data, options) {
    options = options ? options : { };
    // By default, allow for a single redirect and a single retry of the original.
    options.maxTries = options.maxTries ? options.maxTries : 3;
    options.returnRequestPath = options.returnRequestPath ? options.returnRequestPath : true;

    let originalIntent = { path, method, data };
    let suggestedRedirect = { };
    let requestPath = [];

    for (let i = 0; i < options.maxTries; i++) {
        try {
            const attemptPath = suggestedRedirect.path ? suggestedRedirect.path : originalIntent.path;
            const attemptData = suggestedRedirect.data ? suggestedRedirect.data : originalIntent.data;
            const attemptMethod = suggestedRedirect.method ? suggestedRedirect.method : originalIntent.method;
            
            const res = await dispatch(attemptPath, attemptMethod, attemptData);
            const mostRecentInfo = await res.json();

            requestPath.push({ res, info: mostRecentInfo });
            
            if (res.status >= 200 && res.status < 300) {
                if (attemptPath === originalIntent.path) {
                    if (options.returnRequestPath)
                        return { mostRecentInfo, requestPath }
                    else
                        return mostRecentInfo;
                }
                // Empty out suggestedRedirect.
                suggestedRedirect = {};
            }

            if (mostRecentInfo && mostRecentInfo.error && mostRecentInfo.redirectURL) {
                suggestedRedirect.path = mostRecentInfo.redirectURL;
                suggestedRedirect.data = mostRecentInfo.data;
            }
        } catch (err) {
            throw err;
        }
    }

    const error = {
                    error: "MaximumDispatchesReached",
                    message: `dispatchTries failed action after ${options.maxTries} times.`,
                    requestPath
                  }
    return error;
}

// dispatchTries("/api/get-deck", "POST", {}, { returnRequestPath: true }).then(res => console.log(res));

export { dispatch, dispatchTries };