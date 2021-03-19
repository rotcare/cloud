// 对象存储，用 http/https 提供 html 页面和 js 源代码
export interface ObjectStorage {
    putObject(path: string, content: string): Promise<void>;
}

// 托管服务端代码的执行
export interface Serverless {
    createSharedLayer(layerCode: string): Promise<void>;
    // 所有的函数都共享同一份 bundle 后的 sharedLayer
    // 所以这里只需要提供函数名就可以了，不需要给函数再额外提供实现代码
    createFunction(functionName: string): Promise<void>;
    invokeFunction(functionName: string): Promise<void>;
}

// 把服务端代码用 http/https 接口暴露到互联网
export interface ApiGateway {
    createRoute(options: {
        path: string;
        httpMethod: string;
        // reference Serverless function
        functionName: string;
    }): Promise<void>;
    reload(options: { projectPackageName: string }): Promise<void>;
}

// 把各种云计算提供的部署接口做一个公共抽象
export interface Cloud {
    objectStorage: ObjectStorage;
    serverless: Serverless;
    apiGateway: ApiGateway;
}