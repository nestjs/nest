# 使用 spawn 实现 PDF 导出的指南

## 概述

本文档展示了如何使用 `child_process.spawn` 替代 `fork` 来实现 PDF 导出功能。

## 文件说明

### 1. 对比文档
- `docs/process-and-logging-comparison.md` - 详细的对比说明

### 2. 示例代码
- `src/report-export/report-export.service.spawn.example.ts` - 使用 spawn 的 Service 示例
- `src/report-export/workers/pdf-export.worker.spawn.example.ts` - 使用 spawn 的 Worker 示例

## 两种通信方式

### 方式1：stdin/stdout 通信（适合小数据）

**优点：**
- ✅ 简单直接
- ✅ 无需临时文件
- ✅ 实时通信

**缺点：**
- ❌ 数据大小受限
- ❌ 需要手动解析 JSON

**使用场景：**
- 数据量小（< 1MB）
- 需要实时响应

### 方式2：文件通信（适合大数据）

**优点：**
- ✅ 支持大数据传输
- ✅ 可以持久化
- ✅ 便于调试（可以查看文件内容）

**缺点：**
- ❌ 需要管理临时文件
- ❌ 需要清理机制
- ❌ 可能有文件系统 I/O 开销

**使用场景：**
- 数据量大
- 需要持久化任务数据
- 跨进程长时间运行

## 使用步骤

### 步骤1：选择通信方式

根据你的需求选择：
- **小数据、实时性要求高** → 使用 stdin/stdout
- **大数据、需要持久化** → 使用文件通信

### 步骤2：修改 Service

将 `report-export.service.ts` 中的 `exportToPdfViaWorker` 方法替换为：

```typescript
// 使用 stdin/stdout
private async exportToPdfViaWorker(url: string, taskId: string): Promise<string> {
  return this.exportToPdfViaSpawnStdin(url, taskId);
}

// 或使用文件通信
private async exportToPdfViaWorker(url: string, taskId: string): Promise<string> {
  return this.exportToPdfViaSpawnFile(url, taskId);
}
```

### 步骤3：修改 Worker

将 `pdf-export.worker.ts` 替换为 `pdf-export.worker.spawn.example.ts` 的内容。

### 步骤4：测试

运行应用并测试 PDF 导出功能。

## 代码示例

### Service 端（使用 stdin/stdout）

```typescript
const worker = spawn(nodeExecutable, args, {
  stdio: ['pipe', 'pipe', 'pipe'],
});

// 发送数据
worker.stdin?.write(JSON.stringify(taskData) + '\n');
worker.stdin?.end();

// 接收数据
worker.stdout?.on('data', (data) => {
  const result = JSON.parse(data.toString());
  // 处理结果
});
```

### Service 端（使用文件）

```typescript
// 写入任务文件
writeFileSync(inputFile, JSON.stringify(taskData));

// 启动进程
const worker = spawn(nodeExecutable, [script, inputFile, outputFile]);

// 等待进程完成
worker.on('exit', () => {
  const result = JSON.parse(readFileSync(outputFile, 'utf-8'));
  // 处理结果
  unlinkSync(inputFile);
  unlinkSync(outputFile);
});
```

### Worker 端（stdin/stdout 模式）

```typescript
process.stdin.on('data', (chunk) => {
  inputData += chunk.toString();
});

process.stdin.on('end', async () => {
  const message = JSON.parse(inputData);
  const result = await processTask(message);
  console.log(JSON.stringify(result));
  process.exit(0);
});
```

### Worker 端（文件模式）

```typescript
const inputFile = process.argv[2];
const outputFile = process.argv[3];

const message = JSON.parse(readFileSync(inputFile, 'utf-8'));
const result = await processTask(message);
writeFileSync(outputFile, JSON.stringify(result));
process.exit(0);
```

## 注意事项

1. **错误处理**：确保正确处理所有错误情况
2. **超时控制**：设置合理的超时时间
3. **资源清理**：及时清理临时文件和子进程
4. **日志记录**：记录关键操作和错误信息
5. **数据验证**：验证输入和输出数据的格式

## 性能对比

| 特性 | fork | spawn (stdin) | spawn (file) |
|------|------|---------------|--------------|
| 启动速度 | 快 | 中等 | 中等 |
| 通信速度 | 快 | 快 | 中等 |
| 数据大小限制 | 中等 | 小 | 大 |
| 配置复杂度 | 低 | 中 | 中 |
| 调试难度 | 低 | 中 | 低（可查看文件） |

## 推荐方案

- **Node.js 脚本 + 需要 IPC** → 使用 `fork`（当前实现）
- **Node.js 脚本 + 大数据** → 使用 `spawn` + 文件通信
- **非 Node.js 程序** → 使用 `spawn`
- **系统命令** → 使用 `spawn`

