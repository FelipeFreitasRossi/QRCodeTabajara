import { ORDER_STATUS_LABEL } from '../../types/order'
import type { OrderStatus } from '../../types/order'
import styles from './StatusBadge.module.css'

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{ORDER_STATUS_LABEL[status]}</span>
}
