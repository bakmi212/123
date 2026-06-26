-- Fix: Generate licenses for products with enable_license=true, not just product_type='license'
CREATE OR REPLACE FUNCTION public.fulfill_order_delivery(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_order record;
  v_product record;
  v_license_key text;
  v_template_id uuid;
  v_validity_days int;
  v_expiry timestamptz;
  v_download_url text;
  v_pid uuid;
  v_item record;
  v_should_generate_license boolean;
BEGIN
  -- Get order details
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND THEN RETURN; END IF;
  
  -- Skip guest orders
  IF v_order.user_id IS NULL THEN RETURN; END IF;
  
  -- Verify order is complete and paid
  IF COALESCE(v_order.status, '') <> 'completed' THEN RETURN; END IF;
  IF COALESCE(v_order.payment_status, '') <> 'paid' THEN RETURN; END IF;
  
  -- Set completed_at if not already set
  IF v_order.completed_at IS NULL THEN
    UPDATE public.orders SET completed_at = now() WHERE id = p_order_id;
  END IF;
  
  -- Process all products in this order
  FOR v_item IN
    SELECT product_id FROM public.order_items WHERE order_id = p_order_id
    UNION
    SELECT product_id FROM public.orders WHERE id = p_order_id AND product_id IS NOT NULL
  LOOP
    v_pid := v_item.product_id;
    SELECT * INTO v_product FROM public.products WHERE id = v_pid;
    IF NOT FOUND THEN CONTINUE; END IF;
    
    -- Ensure user_products ownership exists (unique per user+product)
    INSERT INTO public.user_products (user_id, product_id, order_id, variant_id)
    VALUES (v_order.user_id, v_pid, p_order_id, v_order.variant_id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
    
    -- Determine if license should be generated
    -- License is generated if: product_type = 'license' OR enable_license = true OR license_enabled = true
    v_should_generate_license := (
      v_product.product_type = 'license' 
      OR COALESCE(v_product.enable_license, false) = true
      OR COALESCE(v_product.license_enabled, false) = true
    );
    
    IF v_should_generate_license THEN
      -- Check if license already exists for this user+product+order
      IF NOT EXISTS (
        SELECT 1 FROM public.licenses
        WHERE user_id = v_order.user_id 
        AND product_id = v_pid
        AND (order_id = p_order_id OR order_id IS NULL)
      ) THEN
        -- Get active license template
        SELECT id, validity_days INTO v_template_id, v_validity_days
        FROM public.license_templates WHERE is_active = true
        ORDER BY created_at ASC LIMIT 1;
        
        -- Generate license key
        v_license_key := public.generate_license_key(v_template_id);
        
        -- Calculate expiry date
        v_expiry := NULL;
        IF v_validity_days IS NOT NULL AND v_validity_days > 0 THEN
          v_expiry := now() + (v_validity_days || ' days')::interval;
        END IF;
        
        -- Insert into licenses table
        INSERT INTO public.licenses (
          user_id, product_id, license_key, status, purchase_date,
          expiry_date, expires_at, order_id, template_id, activated_at, max_activations
        ) VALUES (
          v_order.user_id, v_pid, v_license_key, 'active', now(),
          v_expiry, v_expiry, p_order_id, v_template_id, now(), COALESCE(v_product.license_limit, 1)
        );
        
        -- Insert into user_licenses table
        INSERT INTO public.user_licenses (user_id, product_id, license_key, expires_at, status)
        VALUES (v_order.user_id, v_pid, v_license_key, v_expiry, 'active')
        ON CONFLICT (user_id, product_id) DO NOTHING;
        
        -- Update order with license key
        UPDATE public.orders SET license_key = v_license_key WHERE id = p_order_id AND license_key IS NULL;
        
        RAISE LOG 'License generated: order=%, product=%, user=%, key=%', 
          p_order_id, v_pid, v_order.user_id, v_license_key;
      END IF;
    END IF;
    
    -- Handle download URL for non-license products or in addition to licenses
    v_download_url := CASE
      WHEN v_product.product_type = 'external_link' THEN COALESCE(v_product.external_url, v_product.download_url)
      ELSE COALESCE(v_product.download_url, v_product.download_file)
    END;
    
    -- Record user download access
    INSERT INTO public.user_downloads (user_id, product_id, order_id)
    VALUES (v_order.user_id, v_pid, p_order_id)
    ON CONFLICT (user_id, product_id) DO NOTHING;
    
    -- Update order with download URL
    UPDATE public.orders
    SET product_download_url = v_download_url
    WHERE id = p_order_id AND product_download_url IS NULL;
    
  END LOOP;
END;
$function$;
