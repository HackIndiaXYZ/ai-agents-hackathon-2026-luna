import Badge from './Badge';

export default function ContractTypeBadge({ type }) {
  return <Badge variant={type === 'BUY' ? 'buy' : 'sell'}>{type}</Badge>;
}
