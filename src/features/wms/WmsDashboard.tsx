"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ledgerEntries,
  operationalTasks,
  pickingWaves,
  positions,
  preReceipts,
  products,
  salesOrders,
  stockItems,
  users,
} from "./mock-data";
import type {
  PickingWave,
  PreReceipt,
  SalesOrder,
  StatusTone,
  StockItem,
  UserProfile,
} from "./types";

type SectionId =
  | "dashboard"
  | "warehouse"
  | "products"
  | "receipts"
  | "orders"
  | "stock"
  | "audit"
  | "users";

const navigation: { id: SectionId; label: string; hint: string }[] = [
  { id: "dashboard", label: "Dashboard", hint: "Indicadores" },
  { id: "warehouse", label: "Armazem", hint: "Zonas e posicoes" },
  { id: "products", label: "Produtos", hint: "Catalogo e rastreio" },
  { id: "receipts", label: "Recebimentos", hint: "Pre-recebimento" },
  { id: "orders", label: "Pedidos e ondas", hint: "Planejamento" },
  { id: "stock", label: "Estoque", hint: "Saldos e bloqueios" },
  { id: "audit", label: "Auditoria", hint: "Livro razao" },
  { id: "users", label: "Usuarios", hint: "Perfis de acesso" },
];

const toneMap: Record<string, StatusTone> = {
  Ativo: "success",
  Disponivel: "success",
  Conferido: "success",
  Concluida: "success",
  Separado: "success",
  Liberada: "info",
  "Conferencia liberada": "info",
  Planejada: "info",
  Pendente: "warning",
  "Aguardando doca": "warning",
  Reservado: "warning",
  Reservada: "warning",
  "Em onda": "warning",
  "Em execucao": "warning",
  Divergente: "danger",
  Bloqueado: "danger",
  Bloqueada: "danger",
  Qualidade: "danger",
  Cancelado: "danger",
  Inativo: "neutral",
  Ocupada: "neutral",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("pt-BR").format(value);
}

function StatusPill({ value }: { value: string }) {
  const tone = toneMap[value] ?? "neutral";
  return <span className={`status-pill status-${tone}`}>{value}</span>;
}

function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p>{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function MetricCard({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail: string;
  trend: string;
}) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <div>
        <small>{detail}</small>
        <em>{trend}</em>
      </div>
    </div>
  );
}

function ProgressBar({ value }: { value: number }) {
  return (
    <div className="progress-track" aria-label={`${value}%`}>
      <span style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  );
}

function WmsTable({
  columns,
  children,
}: {
  columns: string[];
  children: React.ReactNode;
}) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function DashboardHome({
  receipts,
  orders,
  waves,
  stock,
}: {
  receipts: PreReceipt[];
  orders: SalesOrder[];
  waves: PickingWave[];
  stock: StockItem[];
}) {
  const availableUnits = stock.reduce(
    (total, item) => total + item.quantity - item.reserved,
    0,
  );
  const reservedUnits = stock.reduce((total, item) => total + item.reserved, 0);
  const blockedUnits = stock
    .filter((item) => item.status === "Bloqueado" || item.status === "Qualidade")
    .reduce((total, item) => total + item.quantity, 0);
  const pendingOrders = orders.filter((order) => order.status === "Pendente").length;

  return (
    <div className="screen-grid">
      <div className="metrics-grid">
        <MetricCard
          label="Unidades disponiveis"
          value={formatNumber(availableUnits)}
          detail={`${formatNumber(reservedUnits)} reservadas`}
          trend="+8,4%"
        />
        <MetricCard
          label="Pedidos pendentes"
          value={String(pendingOrders)}
          detail="Aguardando onda"
          trend="SLA hoje"
        />
        <MetricCard
          label="Pre-recebimentos"
          value={String(receipts.length)}
          detail="Sem gerar saldo fisico"
          trend="Doca ativa"
        />
        <MetricCard
          label="Saldo bloqueado"
          value={formatNumber(blockedUnits)}
          detail="Qualidade ou avaria"
          trend="Auditar"
        />
      </div>

      <Card
        title="Saude operacional"
        subtitle="Visao de gestor para priorizar decisoes do painel web"
        className="wide-card"
      >
        <div className="operation-board">
          {[
            ["Recebimento", 72, "Doca 01 com conferencia liberada"],
            ["Armazenagem", 58, "Tarefas geradas para o chao de fabrica"],
            ["Separacao", 81, "Ondas FEFO/FIFO em andamento"],
            ["Expedicao", 64, "Pedidos separados aguardando doca"],
          ].map(([label, value, description]) => (
            <div className="operation-row" key={label as string}>
              <div>
                <strong>{label}</strong>
                <span>{description}</span>
              </div>
              <ProgressBar value={Number(value)} />
              <b>{value}%</b>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Tarefas monitoradas" subtitle="Acompanhamento, sem tela de execucao mobile">
        <div className="task-stack">
          {operationalTasks.map((task) => (
            <article className="task-item" key={task.id}>
              <div>
                <span>{task.type}</span>
                <strong>{task.reference}</strong>
                <small>{task.operator}</small>
              </div>
              <StatusPill value={task.status} />
              <ProgressBar value={task.progress} />
            </article>
          ))}
        </div>
      </Card>

      <Card title="Ondas recentes" subtitle="Reservas e roteirizacao geradas pelo gestor">
        <div className="wave-list">
          {waves.map((wave) => (
            <article key={wave.id}>
              <div>
                <strong>{wave.id}</strong>
                <span>{wave.route}</span>
              </div>
              <small>{wave.orders} pedidos</small>
              <StatusPill value={wave.status} />
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function WarehouseScreen() {
  return (
    <div className="screen-grid">
      <Card
        title="Estrutura do armazem"
        subtitle="Cadastro visual de zonas, ruas e posicoes com capacidade fisica"
        className="wide-card"
        action={<button className="primary-button">Nova posicao</button>}
      >
        <div className="warehouse-map">
          {positions.map((position) => {
            const occupancy = Math.round((position.usedKg / position.capacityKg) * 100);
            return (
              <article className={`position-tile ${position.status.toLowerCase()}`} key={position.id}>
                <header>
                  <strong>{position.id}</strong>
                  <StatusPill value={position.status} />
                </header>
                <span>{position.zone}</span>
                <ProgressBar value={occupancy} />
                <small>
                  {position.usedKg}kg de {position.capacityKg}kg
                </small>
              </article>
            );
          })}
        </div>
      </Card>

      <Card title="Capacidade por zona" subtitle="Base para validacao de armazenagem">
        <div className="zone-stack">
          {["Pulmao", "Picking", "Qualidade", "Doca"].map((zone) => {
            const zonePositions = positions.filter((position) => position.zone === zone);
            const used = zonePositions.reduce((total, position) => total + position.usedKg, 0);
            const capacity = zonePositions.reduce((total, position) => total + position.capacityKg, 0);
            const percentage = Math.round((used / capacity) * 100);
            return (
              <div className="zone-item" key={zone}>
                <div>
                  <strong>{zone}</strong>
                  <span>{zonePositions.length} posicoes</span>
                </div>
                <ProgressBar value={percentage} />
                <b>{percentage}%</b>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function ProductsScreen() {
  return (
    <Card
      title="Catalogo de produtos"
      subtitle="SKUs, embalagens e obrigatoriedade de lote/validade"
      action={<button className="primary-button">Novo produto</button>}
    >
      <WmsTable columns={["SKU", "Produto", "Categoria", "Embalagem", "Rastreio", "Status"]}>
        {products.map((product) => (
          <tr key={product.sku}>
            <td><strong>{product.sku}</strong></td>
            <td>{product.name}</td>
            <td>{product.category}</td>
            <td>{product.packageType}</td>
            <td>
              {product.requiresLot ? "Lote" : "Sem lote"}
              {product.requiresExpiration ? " + validade" : ""}
            </td>
            <td><StatusPill value={product.active ? "Ativo" : "Inativo"} /></td>
          </tr>
        ))}
      </WmsTable>
    </Card>
  );
}

function ReceiptsScreen({
  receipts,
  onRelease,
}: {
  receipts: PreReceipt[];
  onRelease: (id: string) => void;
}) {
  return (
    <div className="screen-grid">
      <Card
        title="Pre-recebimentos"
        subtitle="Lancamento documental sem saldo fisico, conforme regra RN017"
        className="wide-card"
        action={<button className="primary-button">Importar NF</button>}
      >
        <WmsTable columns={["ID", "Fornecedor", "Documento", "Previsao", "Itens", "Volumes", "Status", "Acao"]}>
          {receipts.map((receipt) => (
            <tr key={receipt.id}>
              <td><strong>{receipt.id}</strong></td>
              <td>{receipt.supplier}</td>
              <td>{receipt.document}</td>
              <td>{receipt.expectedDate}</td>
              <td>{receipt.items}</td>
              <td>{receipt.volume}</td>
              <td><StatusPill value={receipt.status} /></td>
              <td>
                <button
                  className="ghost-button"
                  disabled={receipt.status !== "Aguardando doca"}
                  onClick={() => onRelease(receipt.id)}
                >
                  Liberar conferencia
                </button>
              </td>
            </tr>
          ))}
        </WmsTable>
      </Card>

      <Card title="Fila de doca" subtitle="Planejamento para recebimento fisico">
        <div className="dock-timeline">
          {receipts.map((receipt) => (
            <article key={receipt.id}>
              <span>{receipt.expectedDate}</span>
              <strong>{receipt.supplier}</strong>
              <small>{receipt.volume} volumes</small>
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function OrdersScreen({
  orders,
  waves,
  onGenerateWave,
  onCancelOrder,
}: {
  orders: SalesOrder[];
  waves: PickingWave[];
  onGenerateWave: () => void;
  onCancelOrder: (id: string) => void;
}) {
  return (
    <div className="screen-grid">
      <Card
        title="Pedidos de venda"
        subtitle="Selecao gerencial para geracao de ondas e cancelamento em cascata"
        className="wide-card"
        action={<button className="primary-button" onClick={onGenerateWave}>Gerar onda FEFO</button>}
      >
        <WmsTable columns={["Pedido", "Cliente", "Prioridade", "Promessa", "Itens", "Alocacao", "Status", "Acao"]}>
          {orders.map((order) => (
            <tr key={order.id}>
              <td><strong>{order.id}</strong></td>
              <td>{order.customer}</td>
              <td>{order.priority}</td>
              <td>{order.promisedDate}</td>
              <td>{order.items}</td>
              <td>
                <div className="allocation-cell">
                  <ProgressBar value={order.allocated} />
                  <span>{order.allocated}%</span>
                </div>
              </td>
              <td><StatusPill value={order.status} /></td>
              <td>
                <button
                  className="ghost-button danger-action"
                  disabled={order.status === "Cancelado" || order.status === "Separado"}
                  onClick={() => onCancelOrder(order.id)}
                >
                  Cancelar
                </button>
              </td>
            </tr>
          ))}
        </WmsTable>
      </Card>

      <Card title="Ondas de separacao" subtitle="Planejamento web; execucao fica com operadores">
        <div className="wave-list vertical">
          {waves.map((wave) => (
            <article key={wave.id}>
              <div>
                <strong>{wave.id}</strong>
                <span>{wave.route}</span>
              </div>
              <small>{wave.strategy} / {wave.tasks} tarefas</small>
              <StatusPill value={wave.status} />
            </article>
          ))}
        </div>
      </Card>
    </div>
  );
}

function StockScreen({
  stock,
  onBlock,
}: {
  stock: StockItem[];
  onBlock: (id: string) => void;
}) {
  return (
    <Card
      title="Consulta de estoque"
      subtitle="Saldo fisico, reserva, status de bloqueio e rastreabilidade por LPN"
      action={<button className="primary-button">Transferencia interna</button>}
    >
      <WmsTable columns={["SKU", "Produto", "LPN", "Lote", "Validade", "Posicao", "Saldo", "Reservado", "Status", "Acao"]}>
        {stock.map((item) => (
          <tr key={item.id}>
            <td><strong>{item.sku}</strong></td>
            <td>{item.product}</td>
            <td>{item.lpn}</td>
            <td>{item.lot}</td>
            <td>{item.expiration}</td>
            <td>{item.position}</td>
            <td>{formatNumber(item.quantity)}</td>
            <td>{formatNumber(item.reserved)}</td>
            <td><StatusPill value={item.status} /></td>
            <td>
              <button
                className="ghost-button"
                disabled={item.status === "Bloqueado" || item.status === "Qualidade"}
                onClick={() => onBlock(item.id)}
              >
                Bloquear
              </button>
            </td>
          </tr>
        ))}
      </WmsTable>
    </Card>
  );
}

function AuditScreen() {
  return (
    <Card
      title="Livro razao de movimentacoes"
      subtitle="Historico imutavel para auditoria de estoque e rastreabilidade"
      action={<button className="secondary-button">Exportar CSV</button>}
    >
      <WmsTable columns={["Transacao", "Data", "Evento", "SKU", "LPN", "Origem", "Destino", "Qtd.", "Usuario"]}>
        {ledgerEntries.map((entry) => (
          <tr key={entry.id}>
            <td><strong>{entry.id}</strong></td>
            <td>{entry.date}</td>
            <td>{entry.event}</td>
            <td>{entry.sku}</td>
            <td>{entry.lpn}</td>
            <td>{entry.from}</td>
            <td>{entry.to}</td>
            <td>{entry.quantity}</td>
            <td>{entry.user}</td>
          </tr>
        ))}
      </WmsTable>
    </Card>
  );
}

function UsersScreen() {
  return (
    <Card
      title="Usuarios e perfis"
      subtitle="Permissoes do painel web por perfil operacional"
      action={<button className="primary-button">Novo usuario</button>}
    >
      <div className="user-grid">
        {users.map((user: UserProfile) => (
          <article className="user-card" key={user.id}>
            <header>
              <div className="avatar">{user.name.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div>
              <div>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </div>
              <StatusPill value={user.status} />
            </header>
            <div className="role-line">
              <b>{user.role}</b>
              <small>{user.id}</small>
            </div>
            <div className="permission-list">
              {user.permissions.map((permission) => (
                <span key={permission}>{permission}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </Card>
  );
}

export function WmsDashboard() {
  const [activeSection, setActiveSection] = useState<SectionId>("dashboard");
  const [receipts, setReceipts] = useState(preReceipts);
  const [orders, setOrders] = useState(salesOrders);
  const [waves, setWaves] = useState(pickingWaves);
  const [stock, setStock] = useState(stockItems);
  const [notice, setNotice] = useState("Ambiente de apresentacao com dados em memoria.");

  const screenTitle = useMemo(
    () => navigation.find((item) => item.id === activeSection)?.label ?? "Dashboard",
    [activeSection],
  );

  function releaseReceipt(id: string) {
    setReceipts((current) =>
      current.map((receipt) =>
        receipt.id === id ? { ...receipt, status: "Conferencia liberada" } : receipt,
      ),
    );
    setNotice(`${id} liberado para conferencia fisica pelo operador.`);
  }

  function generateWave() {
    const nextWaveNumber = 312 + waves.length;
    const pendingOrders = orders.filter((order) => order.status === "Pendente").slice(0, 2);

    if (pendingOrders.length === 0) {
      setNotice("Nao ha pedidos pendentes para gerar uma nova onda.");
      return;
    }

    const newWave: PickingWave = {
      id: `ONDA-${nextWaveNumber}`,
      orders: pendingOrders.length,
      tasks: pendingOrders.reduce((total, order) => total + order.items, 0),
      route: "B > A > Doca 04",
      strategy: "FEFO",
      status: "Planejada",
    };

    setWaves((current) => [newWave, ...current]);
    setOrders((current) =>
      current.map((order) =>
        pendingOrders.some((pending) => pending.id === order.id)
          ? { ...order, status: "Em onda", allocated: 100 }
          : order,
      ),
    );
    setNotice(`${newWave.id} criada em RAM usando estrategia FEFO.`);
  }

  function cancelOrder(id: string) {
    setOrders((current) =>
      current.map((order) =>
        order.id === id ? { ...order, status: "Cancelado", allocated: 0 } : order,
      ),
    );
    setNotice(`${id} cancelado. Em uma API real, tarefas pendentes seriam canceladas em cascata.`);
  }

  function blockStock(id: string) {
    setStock((current) =>
      current.map((item) =>
        item.id === id ? { ...item, status: "Bloqueado", reserved: 0 } : item,
      ),
    );
    setNotice(`${id} bloqueado para impedir alocacao em novas ondas.`);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <div className="brand-mark">W</div>
          <div>
            <strong>WMS SaaS</strong>
            <span>Painel do gestor</span>
          </div>
        </div>

        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {navigation.map((item) => (
            <button
              className={activeSection === item.id ? "active" : ""}
              key={item.id}
              onClick={() => setActiveSection(item.id)}
            >
              <span>{item.label}</span>
              <small>{item.hint}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <span>Operacao atual</span>
          <strong>CD Paranagua</strong>
          <small>Turno 1 / Gestao web</small>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">Sistema de Gerenciamento de Armazem</span>
            <h1>{screenTitle}</h1>
          </div>
          <div className="topbar-actions">
            <div className="search-box">Buscar SKU, LPN, pedido ou posicao</div>
            <Link className="secondary-button button-link" href="/auth/login">
              Login
            </Link>
          </div>
        </header>

        <div className="notice-bar">
          <strong>RAM</strong>
          <span>{notice}</span>
        </div>

        {activeSection === "dashboard" ? (
          <DashboardHome receipts={receipts} orders={orders} waves={waves} stock={stock} />
        ) : null}
        {activeSection === "warehouse" ? <WarehouseScreen /> : null}
        {activeSection === "products" ? <ProductsScreen /> : null}
        {activeSection === "receipts" ? (
          <ReceiptsScreen receipts={receipts} onRelease={releaseReceipt} />
        ) : null}
        {activeSection === "orders" ? (
          <OrdersScreen
            orders={orders}
            waves={waves}
            onGenerateWave={generateWave}
            onCancelOrder={cancelOrder}
          />
        ) : null}
        {activeSection === "stock" ? <StockScreen stock={stock} onBlock={blockStock} /> : null}
        {activeSection === "audit" ? <AuditScreen /> : null}
        {activeSection === "users" ? <UsersScreen /> : null}
      </section>
    </main>
  );
}
