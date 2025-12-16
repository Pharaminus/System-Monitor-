import si from 'systeminformation';
import pidusage from 'pidusage';

export class MetricsCollector {
  async collectCPUMetrics() {
    const cpuData = await si.currentLoad();
    return {
      usage: cpuData.currentLoad,
      cores: cpuData.cpus.map(cpu => ({
          load: cpu.load,
          speed: (cpu as any).speed || 0
        }))
    };
  }

  async collectMemoryMetrics() {
    const mem = await si.mem();
    return {
      total: mem.total,
      used: mem.used,
      free: mem.free,
      available: mem.available,
      swapTotal: mem.swaptotal,
      swapUsed: mem.swapused
    };
  }

  async collectProcesses(limit = 50) {
    const processes = await si.processes();
    const list = processes.list.slice(0, limit);
    const enriched = await Promise.all(list.map(async (proc) => {
      try {
        const usage = await pidusage(proc.pid);
        return {
          pid: proc.pid,
          name: proc.name,
          user: proc.user,
          cpu: usage.cpu,
          memory: usage.memory,
          state: proc.state
        };
      } catch (e) {
        return {
          pid: proc.pid,
          name: proc.name,
          user: proc.user,
          cpu: 0,
          memory: 0,
          state: proc.state
        };
      }
    }));
    return enriched;
  }

  async collectGPUMetrics() {
    try {
      const gfx = await si.graphics();
      if (process.env.DEBUG_GPU) {
        console.log('[metricsCollector] graphics raw:', JSON.stringify(gfx, null, 2))
      }
      const ctrls = (gfx && gfx.controllers && Array.isArray(gfx.controllers)) ? gfx.controllers : [];
      if (!ctrls.length) return null;
      const normalized = ctrls.map((ctrl: any, idx: number) => {
        const name = ctrl.model || ctrl.name || `${ctrl.vendor || ''} GPU`.trim();
        const memTotal = (ctrl.memoryTotal != null)
          ? ctrl.memoryTotal
          : (ctrl.vram != null ? Number(ctrl.vram) * 1024 * 1024 : null);
        const memUsed = (ctrl.memoryUsed != null) ? ctrl.memoryUsed : (ctrl.vramUsed != null ? Number(ctrl.vramUsed) * 1024 * 1024 : null);
        const util = (ctrl.utilization && ctrl.utilization.gpu != null)
          ? ctrl.utilization.gpu
          : (ctrl.utilizationGpu ?? ctrl.util ?? null);
        return { index: idx, vendor: ctrl.vendor || null, name, util, memUsed, memTotal, bus: ctrl.bus, busAddress: ctrl.busAddress, raw: ctrl };
      });
      if (process.env.DEBUG_GPU) console.log('[metricsCollector] normalized GPUs:', JSON.stringify(normalized, null, 2))
      return normalized;
    } catch (e) {
      return null;
    }
  }
}

export const metricsCollector = new MetricsCollector();
