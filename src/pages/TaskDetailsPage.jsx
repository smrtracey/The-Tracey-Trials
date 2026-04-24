import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import SubmissionForm from '../components/SubmissionForm'
import { useAuth } from '../hooks/useAuth'
import {
  createSubmission,
  fetchLongGameStatus,
  fetchTaskDetails,
  saveLongGameChoice,
  updateTaskCompletion,
} from '../lib/api'
import { getStoredLanguage } from '../lib/language'

const portugueseTaskTextByNumber = {
  1: {
    goal: 'Trabalhar em conjunto para descobrir a senha.',
    description:
      'Todos receberam pistas privadas. Voces vao precisar trabalhar em conjunto para descobrir a senha. No entanto, pontos serao dados apenas aos 3 primeiros jogadores que inserirem a senha corretamente.',
  },
  2: {
    goal: 'Melhorar o maximo possivel no bambole.',
    description: 'Treinem as habilidades de bambole. O tempo sera medido novamente na final.',
  },
  3: {
    goal: 'Ser a primeira pessoa a tirar uma selfie com uma celebridade.',
    description:
      'A celebridade nao pode ser apenas alguem ao fundo, como em um palco ou algo assim. Tambem precisa ser alguem que o taskmaster conheca. Pontos bonus para mencoes do taskmaster.',
  },
  4: {
    goal: 'Iniciar o maior coro em grupo.',
    description:
      'Precisa incluir pelo menos 10 pessoas. O taskmaster vai considerar o local do coro. Cantar em um show e facil. Cantar em um funeral e bem mais dificil...',
  },
  5: {
    goal: 'Conseguir o melhor video de outro jogador rindo.',
    description:
      'Isso vai para votacao em grupo. Quero ver pessoas rindo tanto que cheguem a chorar!',
  },
  6: {
    goal: 'Fazer o maior numero de novos amigos.',
    description:
      'Um amigo e alguem com quem voce saiu depois do primeiro encontro. Para esta tarefa, voce precisa enviar uma foto/video de quando se conheceram e outra foto com a mesma pessoa em uma data posterior. Nao sao permitidas fotos em grupo. Inclua os nomes dos novos amigos.',
  },
  7: {
    goal: 'Completar o maior numero de tarefas.',
    description: 'Os 3 jogadores com mais tarefas concluidas ganham pontos aqui.',
  },
  8: {
    goal: 'Fazer o melhor karaoke.',
    description:
      'Nao ha pontos por talento vocal. A avaliacao sera por escolha da musica, figurino e presenca de palco. Voce pode fazer em dupla com outros jogadores.',
  },
  9: {
    goal: 'Dar ao taskmaster o melhor chapeu.',
    description:
      'Eu gosto de chapeus. Vou escolher o meu favorito. Voce tem 20 euros para gastar no chapeu da sua escolha.',
  },
  10: {
    goal: 'Tirar a melhor foto do nascer e do por do sol no mesmo dia.',
    description:
      'Voce precisa enviar 2 fotos com data/hora ou um timelapse do nascer ao por do sol. Espero que ninguem roube sua GoPro durante o timelapse...',
  },
  11: {
    goal: 'Manter um Tamagotchi vivo pelo maior tempo.',
    description:
      'Voce so tem UMA submissao. Se acha que ele vai morrer amanha, envie hoje. O Tamagotchi que viver mais vence.',
  },
  12: {
    goal: 'Criar o melhor documentario de um unico dia.',
    description:
      'Pode ser em qualquer estilo e em qualquer dia. Entrevistas, narracao, POV, o que quiser. As submissões precisam ser em video.',
  },
  13: {
    goal: 'Conseguir os melhores videos dignos de GoPro nos proximos 6 meses.',
    description:
      'Consiga as melhores cenas de acao. Pode ser qualquer coisa, ate momentos do dia a dia. Se eu vir um video incrivel fazendo cha melhor que um mergulho em alto mar, ele ganha pontos. Variedade importa. Adri e Marika so podem enviar um video irado de bike/escalada cada. Mas enviem bastante por diversao.',
  },
  14: {
    goal: 'Roubar o melhor copo.',
    description:
      'Eu gosto de copos. So pode roubar de pub, nao de casas. Vou decidir qual e meu favorito. E necessario enviar foto/video do copo e apresentar o copo ate a final.',
  },
  15: {
    goal: 'Levar esta bola de praia para o encontro mais romantico.',
    description:
      'Todos, exceto Danny, recebem uma bola de praia; Danny recebe uma boneca sexual com a mesma tarefa. Se Danny descobrir que e o unico com a boneca, ganha 5 pontos e todos os outros recebem zero nesta tarefa.',
  },
  16: {
    goal: 'Criar a melhor tarefa.',
    description:
      'Voce tem 3 meses para enviar sua tarefa. Nos 3 meses seguintes, outros jogadores vao tentar completar as tarefas criadas por voce. Voce ganha pontos pelo quanto eu gostar da tarefa e bonus se as pessoas a completarem.',
  },
  17: {
    goal: 'Conseguir a melhor colecao de fotos espontaneas dos outros jogadores.',
    description:
      'Podem ser tiradas a qualquer momento e de qualquer pessoa, mas devem ser feitas sem que os outros jogadores percebam. Esta tarefa tem limite de 20 fotos por jogador.',
  },
  18: {
    goal: 'Conseguir mais fotos espontaneas com outros jogadores.',
    description:
      'Variante especifica para Katy: conseguir fotos com 3 outros jogadores sem que eles percebam que voce esta la. Suporte de voo e verba para disfarce podem ser combinados com Mikaela.',
  },
  19: {
    goal: 'Como equipe, enviar 20 perguntas para um quiz de mesa.',
    description:
      'O quiz sera jogado presencialmente na final. Se ninguem das outras equipes souber responder a pergunta da sua equipe, sua equipe perde um ponto.',
  },
  20: {
    goal: 'Ao longo da competicao, ganhar mais pontos em duelos contra outros jogadores.',
    description:
      'Desafio recorrente baseado em decisao. A cada algumas semanas, jogadores sao pareados e escolhem cooperar ou trair.',
  },
  21: {
    goal: 'Criar uma maquina de Rube Goldberg para quebrar um ovo.',
    description:
      'Feito em equipes de 3 com restricoes de funcao. A primeira submissao define a ordem das restricoes.',
  },
  22: {
    goal: 'Completar a tarefa enviada pelo outro jogador.',
    description: 'Detalhes em breve.',
  },
  23: {
    goal: 'Escolher o jogador certo para as tarefas.',
    description:
      'Atribua tarefas de criacao aos jogadores com maior chance de completa-las. Voce pode mudar UMA palavra em UMA tarefa; ha bonus por melhorá-la.',
  },
  24: {
    goal: 'Criar a melhor receita caseira e video instrucional.',
    description:
      'Voce tem 3 meses para enviar uma receita caseira por escrito e um video instrucional. O taskmaster vai cozinhar e classificar as submissões.',
  },
}

function toTitleCase(value) {
  return value
    .split(' ')
    .map((word) => (word ? `${word.charAt(0).toUpperCase()}${word.slice(1)}` : word))
    .join(' ')
}

function formatLongGameCountdown(endDate, nowTimestamp) {
  if (!endDate) {
    return '--'
  }

  const targetDate = new Date(`${endDate}T23:59:59`)

  if (Number.isNaN(targetDate.getTime())) {
    return '--'
  }

  const remainingMs = Math.max(0, targetDate.getTime() - nowTimestamp)
  const totalSeconds = Math.floor(remainingMs / 1000)
  const days = Math.floor(totalSeconds / (24 * 60 * 60))
  const hours = Math.floor((totalSeconds % (24 * 60 * 60)) / (60 * 60))
  const minutes = Math.floor((totalSeconds % (60 * 60)) / 60)
  const seconds = totalSeconds % 60

  return `${days}d ${hours}h ${minutes}m ${seconds}s`
}

function TaskDetailsPage() {
  const { token, user } = useAuth()
  const { taskNumber: taskDisplayNumber } = useParams()
  const language = useMemo(() => getStoredLanguage(), [])
  const [task, setTask] = useState(null)
  const [error, setError] = useState('')
  const [completionError, setCompletionError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [submitSuccess, setSubmitSuccess] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSavingCompletion, setIsSavingCompletion] = useState(false)
  const [longGameStatus, setLongGameStatus] = useState(null)
  const [longGameError, setLongGameError] = useState('')
  const [isSavingLongGameChoice, setIsSavingLongGameChoice] = useState(false)
  const [pendingLongGameChoice, setPendingLongGameChoice] = useState('')
  const [longGameNow, setLongGameNow] = useState(() => Date.now())
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const intervalId = setInterval(() => {
      setLongGameNow(Date.now())
    }, 1000)

    return () => {
      clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadTask() {
      try {
        const data = await fetchTaskDetails(token, taskDisplayNumber)

        if (isMounted) {
          setTask(data.task)
          setError('')
        }
      } catch (taskError) {
        if (isMounted) {
          setError(taskError.message)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadTask()

    return () => {
      isMounted = false
    }
  }, [taskDisplayNumber, token])

  useEffect(() => {
    let isMounted = true

    async function loadLongGameStatus() {
      if (!task || task.taskNumber !== 20) {
        if (isMounted) {
          setLongGameStatus(null)
          setLongGameError('')
        }
        return
      }

      try {
        const data = await fetchLongGameStatus(token)

        if (isMounted) {
          setLongGameStatus(data.longGame)
          setLongGameError('')
        }
      } catch (statusError) {
        if (isMounted) {
          setLongGameError(statusError.message)
        }
      }
    }

    loadLongGameStatus()

    return () => {
      isMounted = false
    }
  }, [task, token])

  const title = useMemo(() => {
    if (!task) {
      return ''
    }

    return toTitleCase(task.title)
  }, [task])

  const localizedTaskText = useMemo(() => {
    if (!task || language !== 'pt') {
      return {
        goal: task?.goal ?? '',
        description: task?.description ?? '',
      }
    }

    const localized = portugueseTaskTextByNumber[task.taskNumber]

    return {
      goal: localized?.goal ?? task.goal,
      description: localized?.description ?? task.description,
    }
  }, [language, task])

  async function handleToggleCompletion() {
    if (!task) {
      return
    }

    const previousIsCompleted = task.isCompleted
    const nextIsCompleted = !previousIsCompleted

    setCompletionError('')
    setIsSavingCompletion(true)
    setTask((current) => (current ? { ...current, isCompleted: nextIsCompleted } : current))

    try {
      const data = await updateTaskCompletion(token, task.taskNumber, nextIsCompleted)
      setTask((current) => (current ? { ...current, isCompleted: data.isCompleted } : current))
    } catch (taskCompletionError) {
      setTask((current) => (current ? { ...current, isCompleted: previousIsCompleted } : current))
      setCompletionError(taskCompletionError.message)
    } finally {
      setIsSavingCompletion(false)
    }
  }

  async function handleCreateSubmission(payload) {
    setSubmitError('')
    setSubmitSuccess('')
    setIsSubmitting(true)

    try {
      await createSubmission({ token, ...payload })
      setSubmitSuccess(language === 'pt' ? 'Tarefa enviada com sucesso.' : 'Task submitted successfully.')
    } catch (taskSubmitError) {
      setSubmitError(taskSubmitError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleSelectLongGameChoice(choice) {
    setLongGameError('')
    setIsSavingLongGameChoice(true)

    try {
      await saveLongGameChoice(token, choice)
      setLongGameStatus((current) => (current ? { ...current, currentChoice: choice } : current))
    } catch (choiceError) {
      setLongGameError(choiceError.message)
    } finally {
      setIsSavingLongGameChoice(false)
    }
  }

  function handleConfirmLongGameChoice(choice) {
    if (!choice || isSavingLongGameChoice || longGameStatus?.currentChoice) {
      return
    }

    setPendingLongGameChoice(choice)
  }

  function handleCancelLongGameChoice() {
    setPendingLongGameChoice('')
  }

  async function handleApproveLongGameChoice() {
    if (!pendingLongGameChoice) {
      return
    }

    const choiceToSave = pendingLongGameChoice
    setPendingLongGameChoice('')
    await handleSelectLongGameChoice(choiceToSave)
  }

  const copy = {
    back: language === 'pt' ? 'Voltar para início' : 'Back to home',
    loading: language === 'pt' ? 'Carregando detalhes da tarefa…' : 'Loading task details…',
    completed: language === 'pt' ? 'Concluída' : 'Completed',
    notCompleted: language === 'pt' ? 'Não concluída' : 'Not completed',
    markCompleted: language === 'pt' ? 'Marcar como concluída' : 'Mark as completed',
    markNotCompleted: language === 'pt' ? 'Marcar como não concluída' : 'Mark as not completed',
    goal: language === 'pt' ? 'Objetivo' : 'Goal',
    description: language === 'pt' ? 'Descrição' : 'Description',
    deadline: language === 'pt' ? 'Prazo' : 'Deadline',
    longGameTitle: language === 'pt' ? 'Duelo desta rodada' : 'This round duel',
    longGameRoundLabel: language === 'pt' ? 'Rodada' : 'Round',
    longGameCountdownLabel: language === 'pt' ? 'Tempo restante' : 'Time remaining',
    longGameOpponentLabel: language === 'pt' ? 'Adversário' : 'Opponent',
    longGameStatusActive: language === 'pt' ? 'Ativa agora' : 'Active now',
    longGameStatusUpcoming: language === 'pt' ? 'Próxima rodada' : 'Upcoming round',
    longGameStatusCompleted: language === 'pt' ? 'Rodada encerrada' : 'Round closed',
    longGameBye: language === 'pt' ? 'Você está de folga nesta rodada.' : 'You have a bye in this round.',
    longGameMissingOpponent:
      language === 'pt'
        ? 'Não foi possível encontrar seu adversário para esta rodada.'
        : 'Your opponent could not be resolved for this round.',
    cooperate: language === 'pt' ? 'Cooperar' : 'Cooperate',
    betray: language === 'pt' ? 'Trair' : 'Betray',
    longGameYourChoice: language === 'pt' ? 'Sua escolha' : 'Your choice',
    longGameChoosePrompt:
      language === 'pt' ? 'Faça sua escolha' : 'Make your choice',
    longGameConfirmTitle: language === 'pt' ? 'Confirmar escolha' : 'Confirm choice',
    longGameConfirmBody:
      language === 'pt' ? 'Deseja confirmar sua escolha?' : 'Do you want to confirm your choice?',
    confirm: language === 'pt' ? 'Confirmar' : 'Confirm',
    cancel: language === 'pt' ? 'Cancelar' : 'Cancel',
    submitTitle: language === 'pt' ? 'Enviar para esta tarefa' : 'Submit for this task',
    submitHint:
      language === 'pt' ? 'Envie mídia, escreva texto, ou inclua ambos.' : 'Upload media, write text, or include both.',
  }

  const shouldShowLongGameCard = Boolean(
    longGameStatus &&
      longGameStatus.roundStatus === 'active' &&
      !longGameStatus.isBye &&
      longGameStatus.opponent,
  )

  return (
    <main className="app-shell">
      <section className="task-details-layout">
        <div className="button-row">
          <Link className="button-ghost" to="/">
            {copy.back}
          </Link>
        </div>

        <article className="panel task-details-panel">
          {isLoading ? <p className="muted">{copy.loading}</p> : null}

          {!isLoading && error ? <div className="error-banner">{error}</div> : null}

          {!isLoading && !error && task ? (
            <>
              <header className="task-details-header">
                <span className={`pill ${task.isCompleted ? 'task-pill-complete' : ''}`}>
                  {task.isCompleted ? copy.completed : copy.notCompleted}
                </span>
                <button
                  className="button-secondary task-completion-button"
                  type="button"
                  onClick={handleToggleCompletion}
                  disabled={isSavingCompletion}
                >
                  {task.isCompleted ? copy.markNotCompleted : copy.markCompleted}
                </button>
              </header>

              {completionError ? <div className="error-banner">{completionError}</div> : null}

              <h1>{title}</h1>

              <div className="task-meta-grid">
                <div className="task-meta-card">
                  <h2>{copy.goal}</h2>
                  <p>{localizedTaskText.goal}</p>
                </div>

                <div className="task-meta-card">
                  <h2>{copy.description}</h2>
                  <p>{localizedTaskText.description}</p>
                </div>

                {task.hasTimeConstraint && task.deadlineLabel ? (
                  <div className="task-meta-card">
                    <h2>{copy.deadline}</h2>
                    <p>{task.deadlineLabel}</p>
                  </div>
                ) : null}
              </div>

              {task.taskNumber === 20 && shouldShowLongGameCard ? (
                <section className="task-meta-card long-game-card">
                  <div className="long-game-header-row">
                    <h2>{copy.longGameTitle}</h2>
                    {longGameStatus ? (
                      <span className="pill">
                        {longGameStatus.roundStatus === 'active'
                          ? copy.longGameStatusActive
                          : copy.longGameStatusCompleted}
                      </span>
                    ) : null}
                  </div>

                  {longGameError ? <div className="error-banner">{longGameError}</div> : null}

                  {longGameStatus ? (
                    <div className="long-game-content">
                      <p>
                        <strong>{copy.longGameRoundLabel}:</strong> {longGameStatus.roundNumber}
                      </p>
                      <p>
                        <strong>{copy.longGameCountdownLabel}:</strong>{' '}
                        {formatLongGameCountdown(longGameStatus.endDate, longGameNow)}
                      </p>

                      <p>
                        <strong>{copy.longGameOpponentLabel}:</strong> {longGameStatus.opponent.displayName}
                      </p>

                      <div className="long-game-choice-block">
                        <p className="long-game-choice-prompt">{copy.longGameChoosePrompt}</p>
                        <div className="long-game-choice-actions">
                          <button
                            className={`button-secondary${longGameStatus.currentChoice === 'cooperate' ? ' long-game-choice-active' : ''}`}
                            type="button"
                            disabled={isSavingLongGameChoice || Boolean(longGameStatus.currentChoice)}
                            onClick={() => handleConfirmLongGameChoice('cooperate')}
                          >
                            {copy.cooperate}
                          </button>
                          <button
                            className={`button-secondary${longGameStatus.currentChoice === 'betray' ? ' long-game-choice-active' : ''}`}
                            type="button"
                            disabled={isSavingLongGameChoice || Boolean(longGameStatus.currentChoice)}
                            onClick={() => handleConfirmLongGameChoice('betray')}
                          >
                            {copy.betray}
                          </button>
                        </div>

                        {longGameStatus.currentChoice ? (
                          <p className="muted">
                            {copy.longGameYourChoice}:{' '}
                            {longGameStatus.currentChoice === 'cooperate' ? copy.cooperate : copy.betray}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ) : null}
                </section>
              ) : null}

              <section className="stack">
                <div className="panel-header">
                  <div>
                    <h2>{copy.submitTitle}</h2>
                    <p className="muted">{copy.submitHint}</p>
                  </div>
                </div>

                {submitError ? <div className="error-banner">{submitError}</div> : null}
                {submitSuccess ? <div className="success-banner">{submitSuccess}</div> : null}

                <SubmissionForm
                  isSubmitting={isSubmitting}
                  onSubmit={handleCreateSubmission}
                  fixedTaskNumber={task.taskNumber}
                  language={language}
                />
              </section>
            </>
          ) : null}
        </article>
      </section>

      {pendingLongGameChoice ? (
        <div className="mandatory-info-backdrop" role="presentation" onClick={handleCancelLongGameChoice}>
          <div
            className="mandatory-info-dialog"
            role="dialog"
            aria-modal="true"
            aria-label={copy.longGameConfirmTitle}
            onClick={(event) => event.stopPropagation()}
          >
            <h3>{copy.longGameConfirmTitle}</h3>
            <p>
              {copy.longGameConfirmBody}{' '}
              <strong>{pendingLongGameChoice === 'cooperate' ? copy.cooperate : copy.betray}</strong>
            </p>
            <div className="mandatory-info-actions">
              <button className="button-ghost" type="button" onClick={handleCancelLongGameChoice}>
                {copy.cancel}
              </button>
              <button className="button-secondary" type="button" onClick={handleApproveLongGameChoice}>
                {copy.confirm}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

export default TaskDetailsPage
