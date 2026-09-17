-- Enable pgcrypto for UUIDs
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Graphs Table
CREATE TABLE public.graphs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    total_nodes INT DEFAULT 0,
    total_connections INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Nodes Table
CREATE TABLE public.nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id UUID NOT NULL REFERENCES public.graphs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Connections Table
CREATE TABLE public.connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id UUID NOT NULL REFERENCES public.graphs(id) ON DELETE CASCADE,
    person1_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    person2_id UUID NOT NULL REFERENCES public.nodes(id) ON DELETE CASCADE,
    score INT NOT NULL DEFAULT 50,
    relationship_status TEXT DEFAULT 'None',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Graph Shares Table
CREATE TABLE public.graph_shares (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    graph_id UUID NOT NULL REFERENCES public.graphs(id) ON DELETE CASCADE,
    shared_email TEXT NOT NULL,
    view_config JSONB DEFAULT '{"allowed_node_ids": null, "relationship_visibility": "show_all"}'::jsonb,
    edit_config JSONB DEFAULT '{"can_edit_name": false, "can_edit_record": false, "can_edit_score": false, "can_edit_relationship": false, "master_access": false}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(graph_id, shared_email)
);

-- Enable RLS
ALTER TABLE public.graphs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.graph_shares ENABLE ROW LEVEL SECURITY;

-- Graphs Policies
CREATE POLICY "Users can manage their own graphs"
    ON public.graphs FOR ALL
    USING (owner_id = auth.uid());

CREATE POLICY "Shared users can view graphs"
    ON public.graphs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.graphs.id AND shared_email = auth.jwt()->>'email'
    ));

-- Nodes Policies
CREATE POLICY "Owners can manage nodes"
    ON public.nodes FOR ALL
    USING (EXISTS (SELECT 1 FROM public.graphs WHERE id = public.nodes.graph_id AND owner_id = auth.uid()));

CREATE POLICY "Shared users can view nodes"
    ON public.nodes FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.nodes.graph_id AND shared_email = auth.jwt()->>'email'
        AND (
            (view_config->>'allowed_node_ids') IS NULL 
            OR (view_config->'allowed_node_ids') @> to_jsonb(public.nodes.id::text)
        )
    ));

CREATE POLICY "Shared users can insert nodes if they have record access"
    ON public.nodes FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.nodes.graph_id AND shared_email = auth.jwt()->>'email'
        AND ( (edit_config->>'master_access')::boolean OR (edit_config->>'can_edit_record')::boolean )
    ));

CREATE POLICY "Shared users can update nodes"
    ON public.nodes FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.nodes.graph_id AND shared_email = auth.jwt()->>'email'
        AND ( (edit_config->>'master_access')::boolean OR (edit_config->>'can_edit_name')::boolean )
    ));

CREATE POLICY "Shared users can delete nodes if they have record access"
    ON public.nodes FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.nodes.graph_id AND shared_email = auth.jwt()->>'email'
        AND ( (edit_config->>'master_access')::boolean OR (edit_config->>'can_edit_record')::boolean )
    ));

-- Connections Policies
CREATE POLICY "Owners can manage connections"
    ON public.connections FOR ALL
    USING (EXISTS (SELECT 1 FROM public.graphs WHERE id = public.connections.graph_id AND owner_id = auth.uid()));

CREATE POLICY "Shared users can view connections"
    ON public.connections FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.connections.graph_id AND shared_email = auth.jwt()->>'email'
        AND (
            (view_config->>'allowed_node_ids') IS NULL 
            OR (
                (view_config->'allowed_node_ids') @> to_jsonb(public.connections.person1_id::text)
                AND (view_config->'allowed_node_ids') @> to_jsonb(public.connections.person2_id::text)
            )
        )
        -- Handled relationship visibility at frontend for simplicity, or complex SQL here. Let's keep it simple.
    ));

CREATE POLICY "Shared users can insert connections"
    ON public.connections FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.connections.graph_id AND shared_email = auth.jwt()->>'email'
        AND ( (edit_config->>'master_access')::boolean OR (edit_config->>'can_edit_record')::boolean )
    ));

CREATE POLICY "Shared users can update connections"
    ON public.connections FOR UPDATE
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.connections.graph_id AND shared_email = auth.jwt()->>'email'
        -- Actual column permissions checked via trigger
    ));

CREATE POLICY "Shared users can delete connections"
    ON public.connections FOR DELETE
    USING (EXISTS (
        SELECT 1 FROM public.graph_shares 
        WHERE graph_id = public.connections.graph_id AND shared_email = auth.jwt()->>'email'
        AND ( (edit_config->>'master_access')::boolean OR (edit_config->>'can_edit_record')::boolean )
    ));

-- Graph Shares Policies (Only owner can manage)
CREATE POLICY "Owners can manage shares"
    ON public.graph_shares FOR ALL
    USING (EXISTS (SELECT 1 FROM public.graphs WHERE id = public.graph_shares.graph_id AND owner_id = auth.uid()));

-- Column-level edit permission trigger for Connections
CREATE OR REPLACE FUNCTION check_connection_edit_permissions()
RETURNS TRIGGER AS $$
DECLARE
    share_record RECORD;
BEGIN
    -- Skip if owner
    IF EXISTS (SELECT 1 FROM public.graphs WHERE id = NEW.graph_id AND owner_id = auth.uid()) THEN
        RETURN NEW;
    END IF;

    -- Fetch share config
    SELECT * INTO share_record FROM public.graph_shares 
    WHERE graph_id = NEW.graph_id AND shared_email = auth.jwt()->>'email';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    IF (share_record.edit_config->>'master_access')::boolean = true THEN
        RETURN NEW;
    END IF;

    -- Check score changes
    IF OLD.score IS DISTINCT FROM NEW.score AND (share_record.edit_config->>'can_edit_score')::boolean = false THEN
        RAISE EXCEPTION 'Permission denied to edit score';
    END IF;

    -- Check relationship changes
    IF OLD.relationship_status IS DISTINCT FROM NEW.relationship_status AND (share_record.edit_config->>'can_edit_relationship')::boolean = false THEN
        RAISE EXCEPTION 'Permission denied to edit relationship';
    END IF;

    -- If trying to edit person1 or person2 ids, that's a record change
    IF (OLD.person1_id IS DISTINCT FROM NEW.person1_id OR OLD.person2_id IS DISTINCT FROM NEW.person2_id) 
        AND (share_record.edit_config->>'can_edit_record')::boolean = false THEN
        RAISE EXCEPTION 'Permission denied to edit record nodes';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER tr_check_connection_edits
    BEFORE UPDATE ON public.connections
    FOR EACH ROW
    EXECUTE FUNCTION check_connection_edit_permissions();
