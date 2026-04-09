/**
 * EKP 服务层统一导出
 * 
 * 使用方式：
 * import { todoService, flowService, formService, flowMappingService } from '@/lib/ekp/services';
 */

// 待办服务
export { todoService, TodoService, PRESET_TODO_INTERFACES } from './todo-service';
export type {
  TodoItem,
  TodoDetail,
  TodoType,
  TodoStatus,
  ApproveParams,
  TransferParams,
  QueryParams,
  OperationResult,
  Attachment,
} from './todo-service';

// 流程服务
export { flowService, FlowService, PRESET_FLOW_INTERFACES } from './flow-service';
export type {
  FlowTemplate,
  FlowInstance,
  FlowStatus,
  FlowNode,
  FlowProgress,
  LaunchParams,
  FlowOperationResult,
  QueryFlowParams,
} from './flow-service';

// 表单服务
export { formService, FormService } from './form-service';
export type {
  FormField,
  FieldType,
  FieldOption,
  FormTemplate,
  FormGroup,
  FormAction,
  FormData,
  ValidationResult,
  ValidationError,
  FormatOptions,
} from './form-service';

// 流程映射服务
export { flowMappingService, FlowMappingService } from './flow-mapping-service';
export type {
  FlowMapping,
  FlowMappingParams,
  FlowMappingQuery,
} from './flow-mapping-service';
