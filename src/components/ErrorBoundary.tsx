// 错误边界:单个工具页渲染异常时降级为错误提示,不拖垮整个应用
import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** 降级时展示的名称(如工具名) */
  name?: string;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // 控制台留痕,便于排查
    console.error(`[ErrorBoundary${this.props.name ? ':' + this.props.name : ''}]`, error, info.componentStack);
  }

  private reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <div className="result-card" role="alert">
          <div className="result-title">页面出现异常</div>
          <div className="note-box">
            <b>{this.props.name ?? '当前页面'}</b> 渲染时发生错误:{this.state.error.message || '未知错误'}。
            其他功能不受影响,可尝试重新打开此工具。
          </div>
          <div className="btn-row" style={{ marginTop: 12 }}>
            <button className="btn" onClick={this.reset}>重试</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
