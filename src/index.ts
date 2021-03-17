import type { IoConf } from '@rotcare/io';
import { Model } from '@rotcare/codegen';
import * as path from 'path';

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

export interface SERVERLESS_TYPE {
    ioConf: IoConf;
    functions: Record<string, Function>;
}

declare const SERVERLESS: SERVERLESS_TYPE;

export function generateServerlessFunctions(models: Model[]): SERVERLESS_TYPE['functions'] {
    const lines = [`const functions = {
        migrate: new Impl.HttpRpcServer({ioProvider: () => SERVERLESS.ioConf, func: require('@motherboard/migrate').migrate }).handler
    };`];
    models.sort((a, b) => a.qualifiedName.localeCompare(b.qualifiedName));
    for (const model of models) {
        if (model.archetype !== 'ActiveRecord' && model.archetype !== 'Gateway') {
            continue;
        }
        const services = [
            ...model.staticProperties.map((p) => p.name),
            ...model.staticMethods.map((m) => m.name),
        ];
        for (const service of services) {
            const className = path.basename(model.qualifiedName);
            lines.push(
                [
                    `functions.${service} = Impl.HttpRpcServer.create(() => SERVERLESS.ioConf, `,
                    `() => import('@motherboard/${model.qualifiedName}'), `,
                    `'${className}', '${service}').handler;`,
                ].join(''),
            );
        }
    }
    lines.push('return functions;');
    return lines.join('\n') as any;
}

export function registerServerless(options: typeof SERVERLESS) {
    Object.assign(SERVERLESS, options);
}
