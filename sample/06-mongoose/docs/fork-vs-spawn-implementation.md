# Fork vs Spawn 实现对比

本文档展示了使用 `fork` 和 `spawn` 两种方式实现 PDF 导出 Worker 的完整代码对比。

## 一、Service 层实现对比

### 使用 Fork 的实现（原实现）

```typescript
import { fork, ChildProcess } from 'child_process';

/**
 * 通过子进程（Worker）导出PDF - Fork 版本
 * 这样可以隔离浏览器实例，避免影响主进程
 */
private async exportToPdfViaWorker(url: string, taskId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    logger.info('启动 PDF 导出 Worker 进程', { taskId, url, workerPath: this.workerPath });

    // 准备 fork 参数
    const isTsFile = this.workerPath.endsWith('.ts');
    const execArgv = isTsFile
      ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register']
      : [];

    // 启动 Worker 子进程
    const worker: ChildProcess = fork(this.workerPath, [], {
      stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
      execArgv,
    });

    // 设置超时
    const timeout = setTimeout(() => {
      logger.error('Worker 进程超时', { taskId });
      worker.kill('SIGTERM');
      reject(new Error(`Worker 进程超时（${this.TASK_TIMEOUT / 1000}秒）`));
    }, this.TASK_TIMEOUT);

    // 监听 Worker 消息
    worker.on('message', (message: {
      type: string;
      taskId: string;
      filePath?: string;
      error?: string;
    }) => {
      if (message.taskId !== taskId) {
        return; // 忽略其他任务的消息
      }

      if (message.type === 'success') {
        clearTimeout(timeout);
        logger.info('Worker 进程完成', {
          taskId,
          filePath: message.filePath,
        });
        worker.kill('SIGTERM');
        resolve(message.filePath);
      } else if (message.type === 'error') {
        clearTimeout(timeout);
        logger.error('Worker 进程失败', {
          taskId,
          error: message.error,
        });
        worker.kill('SIGTERM');
        reject(new Error(message.error || 'PDF 导出失败'));
      }
    });

    // 监听 Worker 错误
    worker.on('error', (error) => {
      clearTimeout(timeout);
      logger.error('Worker 进程错误', {
        taskId,
        error: error.message,
        stack: error.stack,
      });
      reject(error);
    });

    // 监听 Worker 退出
    worker.on('exit', (code, signal) => {
      if (code !== 0 && code !== null) {
        clearTimeout(timeout);
        logger.error('Worker 进程异常退出', {
          taskId,
          code,
          signal,
        });
        reject(new Error(`Worker 进程异常退出，退出码: ${code}`));
      }
    });

    // 发送任务到 Worker
    worker.send({
      type: 'export-pdf',
      taskId,
      url,
      uploadDir: this.UPLOAD_DIR,
    });
  });
}
```

**Fork 版本特点：**
- ✅ 使用 `fork()` 方法，专门用于 Node.js 脚本
- ✅ 自动建立 IPC 通道（第4个 stdio 选项为 'ipc'）
- ✅ 使用 `worker.send()` 和 `worker.on('message')` 进行通信
- ✅ 配置简单，代码清晰

### 使用 Spawn 的实现（新实现）

```typescript
import { spawn, ChildProcess } from 'child_process';

/**
 * 通过子进程（Worker）导出PDF - Spawn 版本
 * 使用 stdin/stdout 进行 JSON 通信
 */
private async exportToPdfViaWorker(url: string, taskId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    logger.info('启动 PDF 导出 Worker 进程（spawn）', { taskId, url, workerPath: this.workerPath });

    // 准备 spawn 参数
    const isTsFile = this.workerPath.endsWith('.ts');
    const nodeExecutable = process.execPath; // Node.js 可执行文件路径
    const args = isTsFile
      ? ['-r', 'ts-node/register', '-r', 'tsconfig-paths/register', this.workerPath]
      : [this.workerPath];

    // 使用 spawn 启动子进程
    const worker: ChildProcess = spawn(nodeExecutable, args, {
      stdio: ['pipe', 'pipe', 'pipe'], // stdin, stdout, stderr
      env: {
        ...process.env,
        NODE_ENV: process.env.NODE_ENV || 'development',
      },
    });

    // 设置超时
    const timeout = setTimeout(() => {
      logger.error('Worker 进程超时', { taskId });
      worker.kill('SIGTERM');
      reject(new Error(`Worker 进程超时（${this.TASK_TIMEOUT / 1000}秒）`));
    }, this.TASK_TIMEOUT);

    let stdoutData = '';
    let stderrData = '';

    // 收集 stdout 数据
    worker.stdout?.on('data', (data: Buffer) => {
      stdoutData += data.toString();
    });

    // 收集 stderr 数据（可能包含日志输出）
    worker.stderr?.on('data', (data: Buffer) => {
      stderrData += data.toString();
      // stderr 可能包含 winston 的日志输出，记录但不作为错误
      logger.debug('Worker stderr', { taskId, data: data.toString() });
    });

    // 监听进程退出
    worker.on('exit', (code, signal) => {
      clearTimeout(timeout);

      if (code === 0) {
        try {
          // 解析 JSON 输出（取最后一行，因为可能有日志输出）
          const lines = stdoutData.trim().split('\n');
          const lastLine = lines[lines.length - 1];
          const result = JSON.parse(lastLine);

          if (result.type === 'success') {
            logger.info('Worker 进程完成', {
              taskId,
              filePath: result.filePath,
            });
            resolve(result.filePath);
          } else if (result.type === 'error') {
            logger.error('Worker 进程失败', {
              taskId,
              error: result.error,
            });
            reject(new Error(result.error || 'PDF 导出失败'));
          } else {
            reject(new Error('未知的响应类型'));
          }
        } catch (error) {
          logger.error('解析 Worker 输出失败', {
            taskId,
            error: error.message,
            stdout: stdoutData,
          });
          reject(new Error(`解析 Worker 输出失败: ${error.message}`));
        }
      } else {
        logger.error('Worker 进程异常退出', {
          taskId,
          code,
          signal,
          stderr: stderrData,
        });
        reject(
          new Error(
            `Worker 进程异常退出，退出码: ${code}，错误: ${stderrData}`,
          ),
        );
      }
    });

    // 监听进程错误
    worker.on('error', (error) => {
      clearTimeout(timeout);
      logger.error('Worker 进程错误', {
        taskId,
        error: error.message,
        stack: error.stack,
      });
      reject(error);
    });

    // 通过 stdin 发送任务数据
    const taskData = JSON.stringify({
      type: 'export-pdf',
      taskId,
      url,
      uploadDir: this.UPLOAD_DIR,
    });

    worker.stdin?.write(taskData + '\n');
    worker.stdin?.end();
  });
}
```

**Spawn 版本特点：**
- ✅ 使用 `spawn()` 方法，通用性更强
- ✅ 手动配置 stdio 为 pipe 模式
- ✅ 通过 stdin/stdout 进行 JSON 通信
- ✅ 需要手动解析 JSON 输出
- ✅ 可以运行任何程序，不仅仅是 Node.js

---

## 二、Worker 层实现对比

### 使用 Fork 的 Worker 实现（原实现）

```typescript
/**
 * 处理来自主进程的消息 - Fork 版本
 */
process.on('message', async (message: {
  type: string;
  taskId: string;
  url: string;
  uploadDir: string;
}) => {
  if (message.type === 'export-pdf') {
    try {
      const filePath = await exportToPdf(
        message.url,
        message.taskId,
        message.uploadDir,
      );

      // 发送成功结果给主进程
      process.send({
        type: 'success',
        taskId: message.taskId,
        filePath,
      });
    } catch (error) {
      // 发送错误结果给主进程
      process.send({
        type: 'error',
        taskId: message.taskId,
        error: error.message,
      });
    }
  }
});
```

**Fork Worker 特点：**
- ✅ 使用 `process.on('message')` 接收消息
- ✅ 使用 `process.send()` 发送消息
- ✅ 自动序列化/反序列化数据
- ✅ 代码简洁

### 使用 Spawn 的 Worker 实现（新实现）

```typescript
/**
 * 处理来自主进程的消息 - Spawn 版本（stdin/stdout）
 */
function handleStdinStdoutMode(): void {
  logger.info('Worker 启动（stdin/stdout 模式）');

  let inputData = '';

  // 从 stdin 读取数据
  process.stdin.on('data', (chunk: Buffer) => {
    inputData += chunk.toString();
  });

  process.stdin.on('end', async () => {
    try {
      // 解析输入数据
      const message = JSON.parse(inputData.trim());

      if (message.type === 'export-pdf') {
        const filePath = await exportToPdf(
          message.url,
          message.taskId,
          message.uploadDir,
        );

        // 输出结果到 stdout（JSON 格式）
        const result = {
          type: 'success',
          taskId: message.taskId,
          filePath,
        };
        console.log(JSON.stringify(result));
        process.exit(0);
      } else {
        throw new Error(`未知的消息类型: ${message.type}`);
      }
    } catch (error) {
      // 输出错误到 stdout
      const result = {
        type: 'error',
        taskId: (() => {
          try {
            return JSON.parse(inputData.trim()).taskId || 'unknown';
          } catch {
            return 'unknown';
          }
        })(),
        error: error.message,
      };
      console.error(JSON.stringify(result));
      process.exit(1);
    }
  });

  process.stdin.on('error', (error) => {
    logger.error('读取 stdin 失败', { error: error.message });
    process.exit(1);
  });
}

// 启动处理
handleStdinStdoutMode();
```

**Spawn Worker 特点：**
- ✅ 使用 `process.stdin.on('data')` 接收数据
- ✅ 使用 `console.log()` 输出 JSON 到 stdout
- ✅ 需要手动解析 JSON
- ✅ 需要手动调用 `process.exit()`
- ✅ 更底层，控制更精细

---

## 三、对比总结

| 特性 | Fork | Spawn |
|------|------|-------|
| **导入方式** | `import { fork } from 'child_process'` | `import { spawn } from 'child_process'` |
| **启动方式** | `fork(scriptPath, args, options)` | `spawn(executable, args, options)` |
| **IPC 通信** | 自动建立（`stdio[3] = 'ipc'`） | 手动配置（`stdio = ['pipe', 'pipe', 'pipe']`） |
| **发送数据** | `worker.send(data)` | `worker.stdin.write(data)` |
| **接收数据** | `worker.on('message', callback)` | `worker.stdout.on('data', callback)` |
| **Worker 接收** | `process.on('message', callback)` | `process.stdin.on('data', callback)` |
| **Worker 发送** | `process.send(data)` | `console.log(JSON.stringify(data))` |
| **数据序列化** | 自动 | 手动（JSON.stringify/parse） |
| **适用场景** | Node.js 脚本 | 任何程序 |
| **配置复杂度** | 低 | 中 |
| **代码量** | 少 | 多 |

---

## 四、选择建议

### 使用 Fork 当：
- ✅ 运行 Node.js/TypeScript 脚本
- ✅ 需要进程间通信
- ✅ 快速开发，不需要复杂配置
- ✅ 数据量适中

### 使用 Spawn 当：
- ✅ 需要运行非 Node.js 程序（Python、Shell 等）
- ✅ 需要精确控制子进程
- ✅ 需要跨语言集成
- ✅ 需要更底层的控制
- ✅ 未来可能扩展到其他语言

---

## 五、当前项目选择 Spawn 的原因

1. **更好的控制**：可以精确控制 stdio 流
2. **通用性**：未来可以轻松扩展到其他语言（如 Python）
3. **灵活性**：可以运行任何可执行程序
4. **学习价值**：理解更底层的进程通信机制

