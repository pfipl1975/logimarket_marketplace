CREATE TABLE public.marketplace_order_buyer_contact_snapshots (
    id bigserial PRIMARY KEY,
    marketplace_order_id bigint NOT NULL,
    contact_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    phone character varying(100),
    message character varying(5000),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT uq_mkt_order_buyer_contact_order UNIQUE (marketplace_order_id),
    CONSTRAINT fk_mkt_order_buyer_contact_order FOREIGN KEY (marketplace_order_id) REFERENCES public.marketplace_orders(id)
);

ALTER TABLE public.marketplace_order_buyer_contact_snapshots ENABLE ROW LEVEL SECURITY;
