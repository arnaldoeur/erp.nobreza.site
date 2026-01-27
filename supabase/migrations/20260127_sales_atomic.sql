-- Nobreza ERP - Migração para Transação Atómica de Vendas
-- Data: 2026-01-27
-- Descrição: Cria a função process_sale para garantir integridade entre vendas e stock.

CREATE OR REPLACE FUNCTION process_sale(
  p_sale_data JSON,
  p_items_data JSONB
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sale_id UUID;
  v_item RECORD;
  v_result JSON;
BEGIN
  -- 1. Inserir a Venda
  INSERT INTO sales (
    company_id,
    user_id,
    customer_id,
    total,
    discount,
    payment_method,
    status,
    created_at
  ) VALUES (
    (p_sale_data->>'company_id')::BIGINT,
    (p_sale_data->>'user_id')::UUID,
    (p_sale_data->>'customer_id')::UUID,
    (p_sale_data->>'total')::NUMERIC,
    (p_sale_data->>'discount')::NUMERIC,
    p_sale_data->>'payment_method',
    'COMPLETED',
    NOW()
  ) RETURNING id INTO v_sale_id;

  -- 2. Inserir Itens e Abater Stock
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_data) AS x(
    product_id UUID,
    quantity INTEGER,
    unit_price NUMERIC,
    total NUMERIC
  ) LOOP
    -- Inserir o item
    INSERT INTO sale_items (
      company_id,
      sale_id,
      product_id,
      quantity,
      unit_price,
      total
    ) VALUES (
      (p_sale_data->>'company_id')::BIGINT,
      v_sale_id,
      v_item.product_id,
      v_item.quantity,
      v_item.unit_price,
      v_item.total
    );

    -- Abater o stock
    UPDATE products
    SET quantity = quantity - v_item.quantity
    WHERE id = v_item.product_id;
  END LOOP;

  -- 3. Retornar Sucesso
  v_result := json_build_object(
    'success', true,
    'sale_id', v_sale_id
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  -- O PostgreSQL faz rollback automático em caso de exceção dentro da função
  RAISE EXCEPTION 'Erro ao processar venda: %', SQLERRM;
END;
$$;
