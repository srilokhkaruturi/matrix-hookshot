import GitHubIcon from "../../icons/github.png";
import { BridgeConfig } from "../../BridgeAPI";
import { ConnectionConfigurationProps, IRoomConfigText, RoomConfig } from "./RoomConfig";
import { EventHookCheckbox } from '../elements/EventHookCheckbox';
import { FunctionComponent, createRef } from "preact";
import { GitHubRepoConnectionState, GitHubRepoResponseItem, GitHubRepoConnectionRepoTarget, GitHubRepoConnectionOrgTarget } from "../../../src/Connections/GithubRepo";
import { InputField, ButtonSet, Button } from "../elements";
import { useState, useCallback, useMemo, useEffect } from "preact/hooks";
import { DropItem } from "../elements/DropdownSearch";
import ConnectionSearch from "../elements/ConnectionSearch";
import { ServiceAuth } from "./Auth";
import { GetAuthResponse } from "../../../src/Widgets/BridgeWidgetInterface";

const EventType = "uk.half-shot.matrix-hookshot.github.repository";

function getRepoFullName(state: GitHubRepoConnectionState) {
    return `${state.org}/${state.repo}`;
}

const ConnectionConfiguration: FunctionComponent<ConnectionConfigurationProps<never, GitHubRepoResponseItem, GitHubRepoConnectionState>> = ({
    showAuthPrompt, loginLabel, serviceConfig, api, existingConnection, onSave, onRemove
}) => {
    // Assume true if we have no auth prompt.
    const [authedResponse, setAuthResponse] = useState<GetAuthResponse|null>(null);
    const [enabledHooks, setEnabledHooks] = useState<string[]>(existingConnection?.config.enableHooks || []);

    const checkAuth = useCallback(() => {
        api.getAuth("github").then((res) => {
            setAuthResponse(res);
        }).catch(ex => {
            console.warn("Could not check authed state, assuming yes", ex);
            setAuthResponse({
                authenticated: true,
                user: {
                    name: 'Unknown'
                }
            });
        })
    }, [api]);

    useEffect(() => {
        if (!showAuthPrompt) {
            return;
        }
        checkAuth();
    }, [showAuthPrompt, checkAuth])

    const { newInstallationUrl } = serviceConfig;


    const toggleEnabledHook = useCallback((evt: any) => {
        const key = (evt.target as HTMLElement).getAttribute('x-event-name');
        if (key) {
            setEnabledHooks(enabledHooks => (
                enabledHooks.includes(key) ? enabledHooks.filter(k => k !== key) : [...enabledHooks, key]
            ));
        }
    }, []);

    const [connectionState, setConnectionState] = useState<GitHubRepoConnectionState|null>(null);

    const canEdit = !existingConnection?.id || (existingConnection?.canEdit ?? false);
    const commandPrefixRef = createRef<HTMLInputElement>();
    const handleSave = useCallback((evt: Event) => {
        evt.preventDefault();
        if (!canEdit || !existingConnection && !connectionState) {
            return;
        }
        const state = existingConnection?.config || connectionState;
        if (state) {
            onSave({
                ...(state),
                enableHooks: enabledHooks as any[],
                commandPrefix: commandPrefixRef.current?.value || commandPrefixRef.current?.placeholder,
            });
        }
    }, [enabledHooks, canEdit, existingConnection, connectionState, commandPrefixRef, onSave]);

    const getInstances = useMemo(() => async () => {
        const targets = await api.getConnectionTargets<GitHubRepoConnectionOrgTarget>(EventType, { });
        return targets;
    }, [api]);

    const getProjects = useMemo(() => async (instance: string, search: string, abortController: AbortController) => {
        const targets = await api.getConnectionTargets<GitHubRepoConnectionRepoTarget>(EventType, {
            ...(search && { search }),
            orgName: instance,
        }, abortController);
        return targets.map(repo => ({
            description: repo.description,
            imageSrc: repo.avatar,
            title: repo.name,
            value: repo.state.repo,
        } as DropItem));
    }, [api]);

    const setInstance = useCallback((org: string, repo: string) => {
        setConnectionState({
            org,
            repo,
        })
    },[setConnectionState]);

    const clearInstance = useCallback(() => setConnectionState(null), [setConnectionState]);

    return <form onSubmit={handleSave}>
        {authedResponse && <ServiceAuth onAuthSucceeded={checkAuth} authState={authedResponse} service="github" loginLabel={loginLabel} api={api} />}
        {!existingConnection && authedResponse?.authenticated && <ConnectionSearch
            serviceName="GitHub"
            addNewInstanceUrl={newInstallationUrl}
            getInstances={getInstances}
            getProjects={getProjects}
            onPicked={setInstance}
            onClear={clearInstance}
        />}
        <InputField visible={!!existingConnection || !!connectionState} label="Command Prefix" noPadding={true}>
            <input ref={commandPrefixRef} type="text" value={existingConnection?.config.commandPrefix} placeholder="!gh" />
        </InputField>
        <InputField visible={!!existingConnection || !!connectionState} label="Events" noPadding={true}>
            <p>Choose which event should send a notification to the room</p>
            <ul>
                <EventHookCheckbox enabledHooks={enabledHooks} hookEventName="issue" onChange={toggleEnabledHook}>Issues</EventHookCheckbox>
                <ul>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="issue" hookEventName="issue.created" onChange={toggleEnabledHook}>Created</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="issue" hookEventName="issue.changed" onChange={toggleEnabledHook}>Changed</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="issue" hookEventName="issue.edited" onChange={toggleEnabledHook}>Edited</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="issue" hookEventName="issue.labeled" onChange={toggleEnabledHook}>Labeled</EventHookCheckbox>
                </ul>
                <EventHookCheckbox enabledHooks={enabledHooks} hookEventName="pull_request" onChange={toggleEnabledHook}>Pull requests</EventHookCheckbox>
                <ul>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="pull_request" hookEventName="pull_request.opened" onChange={toggleEnabledHook}>Opened</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="pull_request" hookEventName="pull_request.closed" onChange={toggleEnabledHook}>Closed</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="pull_request" hookEventName="pull_request.merged" onChange={toggleEnabledHook}>Merged</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="pull_request" hookEventName="pull_request.ready_for_review" onChange={toggleEnabledHook}>Ready for review</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="pull_request" hookEventName="pull_request.reviewed" onChange={toggleEnabledHook}>Reviewed</EventHookCheckbox>
                </ul>
                <EventHookCheckbox enabledHooks={enabledHooks} hookEventName="workflow.run" onChange={toggleEnabledHook}>Workflow Runs</EventHookCheckbox>
                <ul>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.success" onChange={toggleEnabledHook}>Success</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.failure" onChange={toggleEnabledHook}>Failed</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.neutral" onChange={toggleEnabledHook}>Neutral</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.cancelled" onChange={toggleEnabledHook}>Cancelled</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.timed_out" onChange={toggleEnabledHook}>Timed Out</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.action_required" onChange={toggleEnabledHook}>Action Required</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="workflow.run" hookEventName="workflow.run.stale" onChange={toggleEnabledHook}>Stale</EventHookCheckbox>
                </ul>
                <EventHookCheckbox enabledHooks={enabledHooks} hookEventName="release" onChange={toggleEnabledHook}>Releases</EventHookCheckbox>
                <ul>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="release" hookEventName="release.created" onChange={toggleEnabledHook}>Published</EventHookCheckbox>
                    <EventHookCheckbox enabledHooks={enabledHooks} parentEvent="release" hookEventName="release.drafted" onChange={toggleEnabledHook}>Drafted</EventHookCheckbox>
                </ul>
            </ul>
        </InputField>
        <ButtonSet>
            { canEdit && authedResponse?.authenticated && <Button type="submit" disabled={!existingConnection && !connectionState}>{ existingConnection?.id ? "Save" : "Add repository" }</Button>}
            { canEdit && existingConnection?.id && <Button intent="remove" onClick={onRemove}>Remove repository</Button>}
        </ButtonSet>
    </form>;
};

const roomConfigText: IRoomConfigText = {
    header: 'GitHub Repositories',
    login: 'Log in to GitHub',
    createNew: 'Add new GitHub repository',
    listCanEdit: 'Your connected repositories',
    listCantEdit: 'Connected repositories',
};

const RoomConfigListItemFunc = (c: GitHubRepoResponseItem) => getRepoFullName(c.config);

export const GithubRepoConfig: BridgeConfig = ({ api, roomId, showHeader }) => {
    const [ goNebConnections, setGoNebConnections ] = useState(undefined);

    useEffect(() => {
        api.getGoNebConnectionsForRoom(roomId).then((res: any) => {
            if (!res) return;
            setGoNebConnections(res.github.map((config: any) => ({
                config,
            })));
        }).catch(ex => {
            console.warn("Failed to fetch go neb connections", ex);
        });
    }, [api, roomId]);

    const compareConnections = useCallback(
        (goNebConnection, nativeConnection) => goNebConnection.config.org === nativeConnection.config.org
                                            && goNebConnection.config.repo === nativeConnection.config.repo,
        []
    );

    return <RoomConfig<never, GitHubRepoResponseItem, GitHubRepoConnectionState>
        headerImg={GitHubIcon}
        showHeader={showHeader}
        api={api}
        roomId={roomId}
        type="github"
        showAuthPrompt={true}
        text={roomConfigText}
        listItemName={RoomConfigListItemFunc}
        connectionEventType={EventType}
        connectionConfigComponent={ConnectionConfiguration}
        migrationCandidates={goNebConnections}
        migrationComparator={compareConnections}
    />;
};
