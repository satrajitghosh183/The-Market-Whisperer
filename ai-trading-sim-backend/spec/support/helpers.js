// This creates a fake 'res' object so we can check if res.status() or res.json() was called
global.mockResponse = () => {
    const res = {};
    res.status = jasmine.createSpy('status').and.returnValue(res);
    res.json = jasmine.createSpy('json');
    return res;
};

// This creates a fake 'req' object
global.mockRequest = (body = {}, user = null) => {
    return {
        body: body,
        user: user
    };
};